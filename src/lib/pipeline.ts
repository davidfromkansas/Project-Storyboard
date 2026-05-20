import { extractArticleContent } from "./exa";
import { getOpenAI } from "./openai";
import { prisma } from "./prisma";
import { INSIGHT_EXTRACTION_PROMPT, IMAGE_STYLE_PREFIX } from "./prompts";
import { getCachedDeck, cacheDeck, hashDeckContent } from "./cache";

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
  "Supporting Ideas": Array<{ Idea: string; Details: string }>;
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
  onProgress: ProgressCallback
) {
  try {
    // Check cache first
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

    // Step 2: Generate insights via GPT-5.5
    const analyzeProgress: PipelineProgress = { step: "analyzing", details: "Analyzing key insights..." };
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "analyzing", progress: JSON.parse(JSON.stringify(analyzeProgress)) },
    });
    onProgress(analyzeProgress);

    const completion = await getOpenAI().responses.create({
      model: "gpt-4.1",
      input: [
        { role: "system", content: INSIGHT_EXTRACTION_PROMPT },
        { role: "user", content: content.text },
      ],
      text: { format: { type: "json_object" } },
    });

    const parsed = JSON.parse(completion.output_text);
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
    const imgStartProgress: PipelineProgress = {
      step: "generating_images",
      current: 0,
      total: insights.length,
      details: `Generating infographic 0 of ${insights.length}...`,
    };
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "generating_images", progress: JSON.parse(JSON.stringify(imgStartProgress)) },
    });
    onProgress(imgStartProgress);

    const slides = await prisma.slide.findMany({
      where: { deckId: deck.id },
      orderBy: { position: "asc" },
    });

    const limit = createLimiter(3);
    let completed = 0;

    // Mark all slides as "generating"
    await prisma.slide.updateMany({
      where: { deckId: deck.id },
      data: { imageStatus: "generating" },
    });

    await Promise.all(
      slides.map((slide) =>
        limit(async () => {
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

          completed++;
          const imgProgress: PipelineProgress = {
            step: "generating_images",
            current: completed,
            total: slides.length,
            details: `Generating infographic ${completed} of ${slides.length}...`,
          };
          await prisma.generationJob.update({
            where: { id: jobId },
            data: { progress: JSON.parse(JSON.stringify(imgProgress)) },
          });
          onProgress(imgProgress);
        })
      )
    );

    // Complete
    const completeProgress: PipelineProgress = { step: "complete", details: deck.id };
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "complete", completedAt: new Date(), progress: JSON.parse(JSON.stringify(completeProgress)) },
    });

    // Only cache decks where all images generated successfully
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
        await cacheDeck(userId, url, deck.id, contentHash);
      }
    } else {
      console.warn(`[pipeline] Skipping cache for deck ${deck.id}: ${failedSlideCount} slide(s) have failed images`);
    }

    onProgress(completeProgress);
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
