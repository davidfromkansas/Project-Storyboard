import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY);

export interface ExtractedContent {
  url: string;
  title: string;
  author: string | null;
  publishedDate: string | null;
  text: string;
}

function isTwitterUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname === "x.com" || hostname === "twitter.com";
  } catch {
    return false;
  }
}

export async function extractArticleContent(
  url: string
): Promise<ExtractedContent> {
  const isTweet = isTwitterUrl(url);

  const result = await exa.getContents([url], {
    text: true,
    ...(isTweet && { maxAgeHours: 0, livecrawlTimeout: 15000 }),
  });

  if (!result.results || result.results.length === 0) {
    throw new Error("No content returned from Exa for this URL");
  }

  const page = result.results[0];

  const minLength = isTweet ? 10 : 100;
  if (!page.text || page.text.length < minLength) {
    throw new Error(
      isTweet
        ? "Could not extract tweet content — the post may be deleted or private"
        : "Content too short — this URL may be paywalled or inaccessible"
    );
  }

  // Truncate to ~15K tokens (~60K chars) to leave headroom for GPT-5.5 output
  const maxChars = 60000;
  const text =
    page.text.length > maxChars ? page.text.slice(0, maxChars) : page.text;

  return {
    url: page.url || url,
    title: page.title || (isTweet ? "Tweet/Post" : "Untitled Article"),
    author: page.author || null,
    publishedDate: page.publishedDate || null,
    text,
  };
}
