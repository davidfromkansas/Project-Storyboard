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

function parseTweetUrl(
  url: string
): { username: string; tweetId: string } | null {
  const match = url.match(/(?:x\.com|twitter\.com)\/(\w+)\/status\/(\d+)/);
  return match ? { username: match[1], tweetId: match[2] } : null;
}

interface FxTweetAuthor {
  name: string;
  screen_name: string;
}

interface FxArticleBlock {
  text: string;
  type: string;
}

interface FxTweetArticle {
  title?: string;
  content?: { blocks: FxArticleBlock[] };
}

interface FxTweetData {
  text: string;
  author: FxTweetAuthor;
  created_at: string;
  article?: FxTweetArticle;
}

interface FxTweetResponse {
  code: number;
  tweet?: FxTweetData;
}

function extractArticleText(article: FxTweetArticle): string {
  if (!article.content?.blocks) return "";
  return article.content.blocks
    .map((block) => block.text)
    .filter((text) => text.length > 0)
    .join("\n\n");
}

async function extractTweetViaFxTwitter(
  url: string
): Promise<ExtractedContent> {
  const parsed = parseTweetUrl(url);
  if (!parsed) throw new Error("Invalid X/Twitter URL format");

  const response = await fetch(
    `https://api.fxtwitter.com/${parsed.username}/status/${parsed.tweetId}`
  );

  if (!response.ok) {
    throw new Error(`FxTwitter API returned ${response.status}`);
  }

  const data = (await response.json()) as FxTweetResponse;
  const tweet = data.tweet;

  if (!tweet) {
    throw new Error("Could not extract post — it may be deleted or private");
  }

  let text = tweet.text || "";
  let title = `Post by @${tweet.author.screen_name}`;

  if (tweet.article) {
    const articleText = extractArticleText(tweet.article);
    if (articleText.length > 0) {
      text = articleText;
      title = tweet.article.title || `Article by @${tweet.author.screen_name}`;
    }
  }

  if (!text || text.length < 5) {
    throw new Error("Could not extract post — it may be deleted or private");
  }

  return {
    url,
    title,
    author: tweet.author.name || tweet.author.screen_name || null,
    publishedDate: tweet.created_at || null,
    text,
  };
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
      "Could not extract post — it may be deleted or private"
    );
  }

  const data = (await response.json()) as {
    url: string;
    author_name: string;
    html: string;
  };
  const text = stripHtml(data.html);

  if (!text || text.length < 10) {
    throw new Error(
      "Could not extract post — it may be deleted or private"
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

async function extractTweetContent(url: string): Promise<ExtractedContent> {
  try {
    return await extractTweetViaFxTwitter(url);
  } catch {
    return extractTweetViaOembed(url);
  }
}

export async function extractArticleContent(
  url: string
): Promise<ExtractedContent> {
  if (isTwitterUrl(url)) {
    return extractTweetContent(url);
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
      "Content too short — this URL may be paywalled or inaccessible"
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
