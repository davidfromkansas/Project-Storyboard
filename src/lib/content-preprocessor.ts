import { getOpenAI } from "./openai";
import { CONTENT_PREPROCESSOR_PROMPT } from "./prompts/index";

export interface ProcessedContent {
  contentType: string;
  structure: Array<{ heading: string; level: number; summary: string }>;
  statistics: Array<{ value: string; context: string }>;
  quotes: Array<{ text: string; context: string }>;
  comparisons: Array<{ sideA: string; sideB: string; context: string }>;
  processes: Array<{ name: string; steps: string[] }>;
}

export async function preprocessContent(rawContent: string): Promise<ProcessedContent> {
  try {
    const completion = await getOpenAI().responses.create({
      model: "gpt-4.1",
      input: [
        { role: "system", content: CONTENT_PREPROCESSOR_PROMPT },
        { role: "user", content: rawContent },
      ],
      text: { format: { type: "json_object" } },
    });

    const parsed = JSON.parse(completion.output_text);

    return {
      contentType: parsed.contentType || "unknown",
      structure: parsed.structure || [],
      statistics: parsed.statistics || [],
      quotes: parsed.quotes || [],
      comparisons: parsed.comparisons || [],
      processes: parsed.processes || [],
    };
  } catch (error) {
    console.error("[preprocessor] Error preprocessing content:", error);
    return {
      contentType: "unknown",
      structure: [],
      statistics: [],
      quotes: [],
      comparisons: [],
      processes: [],
    };
  }
}
