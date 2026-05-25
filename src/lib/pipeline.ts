import { extractArticleContent } from "./exa";
import { openai } from "./openai";
import { prisma } from "./prisma";
import { INSIGHT_EXTRACTION_PROMPT, IMAGE_STYLE_PREFIX } from "./prompts/index";
import { getCachedDeck, cacheDeck, hashDeckContent } from "./cache";
import { preprocessContent } from "./content-preprocessor";

function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        active++;
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            active--;
            if (queue.length > 0) queue.shift()!();
          });
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
  };
}

export interface PipelineProgress {
  step: "extracting" | "analyzing" | "generating_images" | "complete" | "failed";
  current?: number;
  total?: number;
  details?: string;
  error?: string;
}

export type ProgressCallback = (progress: PipelineProgress) => void;

interface InsightRaw {
  "Main Idea": string;
  Summary: string;
  "Supporting Ideas": Array<{ Idea: string; Details: string; "Key Quotes"?: Array<{ text: string; context: string }> }>;
  "Infographic Prompt": string;
}

const COST_EXA = 0.001;
const COST_GPT55_PER_DECK = 0.4;
const COST_IMAGE_MEDIUM = 0.041;
const GLOBAL_SPENDING_CAP = 100.0;

async function checkSpendingCap(): Promise<boolean> {
  const result = await prisma.costLedger.aggregate({
    _sum: { estimatedCost: true },
  });
  const totalSpend = Number(result._sum.estimatedCost ?? 0);
  return totalSpend < GLOBAL_SPENDING_CAP;
}

async function logCost(
  userId: string,
  deckId: string | null,
  slideId: string | null,
  service: string,
  operation: string,
  cost: number
) {
  await prisma.costLedger.create({
    data: {
      userId,
      deckId,
      slideId,
      service,
      operation,
      estimatedCost: cost,
    },
  });
}

export async function runPipeline(
  url: string,
  userId: string,
  jobId: string,
  onProgress: ProgressCallback,
  force: boolean = false
) {
  try {
    // Check cache first (skip if force=true)
    if (!force) {
      const cachedDeckId = await getCachedDeck(userId, url);
      if (cachedDeckId) {
        // Link job to cached deck
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { deckId: cachedDeckId, status: "complete", completedAt: new Date() },
        });
        onProgress({ step: "complete", details: cachedDeckId });
        return;
      }
    }

    // Check spending cap
    const withinBudget = await checkSpendingCap();
    if (!withinBudget) {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { status: "failed", error: "Global spending cap reached ($10)" },
      });
      onProgress({ step: "failed", error: "Global spending cap reached ($10). No more generations allowed." });
      return;
    }

    // Step 1: Extract content via Exa
    onProgress({ step: "extracting", details: "Extracting article content..." });
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "extracting" },
    });

    const content = await extractArticleContent(url);
    await logCost(userId, null, null, "exa", "extract", COST_EXA);

    // Step 1.5: Pre-process content (extract metadata)
    onProgress({ step: "extracting", details: "Analyzing article structure..." });
    const processedContent = await preprocessContent(content.text);
    console.log(`[preprocessor] Content type: ${processedContent.contentType}, ${processedContent.structure.length} sections, ${processedContent.statistics.length} statistics, ${processedContent.quotes.length} quotes, ${processedContent.comparisons.length} comparisons, ${processedContent.processes.length} processes`);

    // Step 2: Generate insights using raw text + supplementary metadata
    onProgress({ step: "analyzing", details: "Analyzing key insights..." });
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "analyzing" },
    });

    const userMessage = `## Article Text\n\n${content.text}\n\n## Supplementary Metadata\n\n${JSON.stringify(processedContent, null, 2)}`;

    const completion = await openai.responses.create({
      model: "gpt-4.1",
      input: [
        { role: "system", content: INSIGHT_EXTRACTION_PROMPT },
        { role: "user", content: userMessage },
      ],
      text: { format: { type: "json_object" } },
      max_output_tokens: 16000,
    });

    let parsed;
    try {
      parsed = JSON.parse(completion.output_text);
    } catch (error) {
      console.error("[pipeline] JSON parse error:", error);
      console.error("[pipeline] Output length:", completion.output_text.length);
      console.error("[pipeline] Output preview:", completion.output_text.slice(0, 500));
      console.error("[pipeline] Output around error position:", completion.output_text.slice(11000, 11200));
      throw new Error(`Failed to parse insight extraction JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    const insights: InsightRaw[] = parsed.insights || parsed;
    await logCost(userId, null, null, "gpt-5.5", "insights", COST_GPT55_PER_DECK);

    if (!Array.isArray(insights) || insights.length === 0) {
      throw new Error("No insights generated from article");
    }

    // Create deck
    const deck = await prisma.deck.create({
      data: {
        userId,
        title: content.title,
        sourceUrl: url,
        exaRaw: JSON.parse(JSON.stringify(content)),
        quality: "medium",
      },
    });

    // Link job to deck
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { deckId: deck.id },
    });

    // Create slides (without images for now)
    for (let i = 0; i < insights.length; i++) {
      const insight = insights[i];
      await prisma.slide.create({
        data: {
          deckId: deck.id,
          position: i,
          mainIdea: insight["Main Idea"],
          summary: insight["Summary"],
          supportingIdeas: insight["Supporting Ideas"],
          infographicPrompt: insight["Infographic Prompt"],
          stylePreset: "whiteboard",
        },
      });
    }

    // Step 3: Generate images with gpt-image-2
    onProgress({
      step: "generating_images",
      current: 0,
      total: insights.length,
      details: `Generating infographic 0 of ${insights.length}...`,
    });
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "generating_images" },
    });

    const slides = await prisma.slide.findMany({
      where: { deckId: deck.id },
      orderBy: { position: "asc" },
    });

    const limit = createLimiter(8);
    let completed = 0;

    await Promise.all(
      slides.map((slide) =>
        limit(async () => {
          try {
            const fullPrompt = IMAGE_STYLE_PREFIX + slide.infographicPrompt;
            const image = await openai.images.generate({
              model: "gpt-image-2",
              prompt: fullPrompt,
              n: 1,
              size: "1536x1024",
              quality: "medium",
            });

            const imageData = image.data?.[0];
            if (imageData && imageData.b64_json) {
              // Store base64 as a data URL for now (Railway storage in future)
              const imageUrl = `data:image/png;base64,${imageData.b64_json}`;
              await prisma.slide.update({
                where: { id: slide.id },
                data: {
                  imageUrl,
                  imageVersions: [
                    { url: imageUrl, prompt: slide.infographicPrompt, createdAt: new Date().toISOString() },
                  ],
                },
              });
            }

            await logCost(userId, deck.id, slide.id, "gpt-image-2", "image_gen", COST_IMAGE_MEDIUM);
          } catch (err) {
            console.error(`[pipeline] Image generation failed for slide ${slide.position}:`, err);
          }

          completed++;
          onProgress({
            step: "generating_images",
            current: completed,
            total: slides.length,
            details: `Generating infographic ${completed} of ${slides.length}...`,
          });
        })
      )
    );

    // Complete
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "complete", completedAt: new Date() },
    });

    // Cache the deck for future requests
    const deckWithSlides = await prisma.deck.findUnique({
      where: { id: deck.id },
      include: { slides: true },
    });
    if (deckWithSlides) {
      const contentHash = hashDeckContent(deckWithSlides);
      await cacheDeck(userId, url, deck.id, contentHash, processedContent);
    }

    onProgress({ step: "complete", details: deck.id });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[pipeline] Error:", err);
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "failed", error: errorMsg },
    });
    onProgress({ step: "failed", error: errorMsg });
  }
}
