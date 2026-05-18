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

interface OembedResponse {
  url: string;
  author_name: string;
  html: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&mdash;/g, "\u2014")
    .trim();
}

async function extractTweetViaOembed(url: string): Promise<ExtractedContent> {
  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
  const response = await fetch(oembedUrl);

  if (!response.ok) {
    throw new Error(
      "Could not extract tweet content \u2014 the post may be deleted or private"
    );
  }

  const data = (await response.json()) as OembedResponse;
  const text = stripHtml(data.html);

  if (!text || text.length < 10) {
    throw new Error(
      "Could not extract tweet content \u2014 the post may be deleted or private"
    );
  }

  return {
    url: data.url || url,
    title: `Post by @${data.author_name}`,
    author: data.author_name || null,
    publishedDate: null,
    text,
  };
}

export async function extractArticleContent(
  url: string
): Promise<ExtractedContent> {
  if (isTwitterUrl(url)) {
    return extractTweetViaOembed(url);
  }

  const result = await exa.getContents([url], {
    text: true,
  });

  if (!result.results || result.results.length === 0) {
    throw new Error("No content returned from Exa for this URL");
  }

  const page = result.results[0];

  if (!page.text || page.text.length < 100) {
    throw new Error(
      "Content too short \u2014 this URL may be paywalled or inaccessible"
    );
  }

  // Truncate to ~15K tokens (~60K chars) to leave headroom for GPT-5.5 output
  const maxChars = 60000;
  const text =
    page.text.length > maxChars ? page.text.slice(0, maxChars) : page.text;

  return {
    url: page.url || url,
    title: page.title || "Untitled Article",
    author: page.author || null,
    publishedDate: page.publishedDate || null,
    text,
  };
}
