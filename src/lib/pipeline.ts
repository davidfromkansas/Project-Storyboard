import { extractArticleContent } from "./exa";
import { getOpenAI } from "./openai";
import { prisma } from "./prisma";
import { INSIGHT_EXTRACTION_PROMPT, IMAGE_STYLE_PREFIX } from "./prompts/index";
import { getCachedDeck, cacheDeck, hashDeckContent } from "./cache";
import { preprocessContent } from "./content-preprocessor";

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateImageWithRetry(
  prompt: string,
): Promise<string | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const image = await getOpenAI().images.generate({
        model: "gpt-image-2",
        prompt,
        n: 1,
        size: "1536x1024",
        quality: "medium",
      });

      const imageData = image.data?.[0];
      if (imageData && imageData.b64_json) {
        return `data:image/png;base64,${imageData.b64_json}`;
      }

      console.warn(`[pipeline] Image generation attempt ${attempt}/${MAX_RETRIES}: no b64_json in response`);
    } catch (err) {
      console.error(`[pipeline] Image generation attempt ${attempt}/${MAX_RETRIES} failed:`, err);
    }

    if (attempt < MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[pipeline] Retrying image generation in ${delay}ms...`);
      await sleep(delay);
    }
  }

  return null;
}

export interface PipelineProgress {
  step: "extracting" | "analyzing" | "generating_images" | "complete" | "failed";
  current?: number;
  total?: number;
  details?: string;
  error?: string;
}

export type ProgressCallback = (progress: PipelineProgress) => void | Promise<void>;

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
        data: { status: "failed", error: "Global spending cap reached ($100)" },
      });
      onProgress({ step: "failed", error: "Global spending cap reached ($100). No more generations allowed." });
      return;
    }

    // Step 1: Extract content via Exa
    const extractProgress: PipelineProgress = { step: "extracting", details: "Extracting article content..." };
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "extracting", progress: JSON.parse(JSON.stringify(extractProgress)) },
    });
    onProgress(extractProgress);

    const content = await extractArticleContent(url);
    await logCost(userId, null, null, "exa", "extract", COST_EXA);

    // Step 1.5: Pre-process content (extract metadata)
    onProgress({ step: "extracting", details: "Analyzing article structure..." });
    const processedContent = await preprocessContent(content.text);
    console.log(`[preprocessor] Content type: ${processedContent.contentType}, ${processedContent.structure.length} sections, ${processedContent.statistics.length} statistics, ${processedContent.quotes.length} quotes, ${processedContent.comparisons.length} comparisons, ${processedContent.processes.length} processes`);

    // Step 2: Generate insights using raw text + supplementary metadata
    const analyzeProgress: PipelineProgress = { step: "analyzing", details: "Analyzing key insights..." };
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "analyzing", progress: JSON.parse(JSON.stringify(analyzeProgress)) },
    });
    onProgress(analyzeProgress);

    const userMessage = `## Article Text\n\n${content.text}\n\n## Supplementary Metadata\n\n${JSON.stringify(processedContent, null, 2)}`;

    const completion = await getOpenAI().responses.create({
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

    // Mark job complete early so the user is redirected to the deck viewer
    const completeProgress: PipelineProgress = { step: "complete", details: deck.id };
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "complete", completedAt: new Date(), progress: JSON.parse(JSON.stringify(completeProgress)) },
    });
    onProgress(completeProgress);

    // Step 3: Generate images with gpt-image-2 in ordered batches
    // Images generate after the user has been redirected to the deck viewer.
    // The deck viewer polls for updates as images complete.
    const slides = await prisma.slide.findMany({
      where: { deckId: deck.id },
      orderBy: { position: "asc" },
    });

    // Mark all slides as "generating"
    await prisma.slide.updateMany({
      where: { deckId: deck.id },
      data: { imageStatus: "generating" },
    });

    // Generate in ordered batches of 3 so early slides are ready first
    const BATCH_SIZE = 3;
    for (let batchStart = 0; batchStart < slides.length; batchStart += BATCH_SIZE) {
      const batch = slides.slice(batchStart, batchStart + BATCH_SIZE);

      await Promise.all(
        batch.map(async (slide) => {
          const fullPrompt = IMAGE_STYLE_PREFIX + slide.infographicPrompt;
          const imageUrl = await generateImageWithRetry(fullPrompt);

          if (imageUrl) {
            await prisma.slide.update({
              where: { id: slide.id },
              data: {
                imageUrl,
                imageStatus: "completed",
                imageVersions: [
                  { url: imageUrl, prompt: slide.infographicPrompt, createdAt: new Date().toISOString() },
                ],
              },
            });
          } else {
            await prisma.slide.update({
              where: { id: slide.id },
              data: { imageStatus: "failed" },
            });
            console.error(`[pipeline] All retries exhausted for slide ${slide.position}`);
          }

          await logCost(userId, deck.id, slide.id, "gpt-image-2", "image_gen", COST_IMAGE_MEDIUM);
        })
      );

    // Complete
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "complete", completedAt: new Date() },
    });

    // Cache deck if all images generated successfully
    const failedSlideCount = await prisma.slide.count({
      where: { deckId: deck.id, imageStatus: "failed" },
    });

    if (failedSlideCount === 0) {
      const deckWithSlides = await prisma.deck.findUnique({
        where: { id: deck.id },
        include: { slides: true },
      });
      if (deckWithSlides) {
        const contentHash = hashDeckContent(deckWithSlides);
        await cacheDeck(userId, url, deck.id, contentHash, processedContent);
      }
    } else {
      console.warn(`[pipeline] Skipping cache for deck ${deck.id}: ${failedSlideCount} slide(s) have failed images`);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[pipeline] Error:", err);
    const failedProgress: PipelineProgress = { step: "failed", error: errorMsg };
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "failed", error: errorMsg, progress: JSON.parse(JSON.stringify(failedProgress)) },
    });
    onProgress(failedProgress);
  }
}
