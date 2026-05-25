import { prisma } from './prisma';
import crypto from 'crypto';
import { ProcessedContent } from './content-preprocessor';

const CACHE_TTL_DAYS = parseInt(process.env.CACHE_TTL_DAYS || '30', 10);

/**
 * Generate a hash for a URL
 */
export function hashUrl(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex');
}

/**
 * Generate a hash for deck content (for future edit detection)
 */
export function hashDeckContent(deck: unknown): string {
  const contentString = JSON.stringify(deck);
  return crypto.createHash('sha256').update(contentString).digest('hex');
}

/**
 * Check if a deck is cached for a user and URL
 * Returns the deckId if cached and not expired, null otherwise
 */
export async function getCachedDeck(userId: string, url: string): Promise<string | null> {
  const urlHash = hashUrl(url);

  const cached = await prisma.contentCache.findUnique({
    where: {
      userId_urlHash: {
        userId,
        urlHash,
      },
    },
  });

  if (!cached) {
    console.log(`[cache] MISS for userId=${userId}, url=${url}`);
    return null;
  }

  // Check if cache has expired
  if (cached.expiresAt < new Date()) {
    console.log(`[cache] EXPIRED for userId=${userId}, url=${url}`);
    // Delete expired cache entry
    await prisma.contentCache.delete({
      where: { id: cached.id },
    });
    return null;
  }

  console.log(`[cache] HIT for userId=${userId}, url=${url}, deckId=${cached.deckId}`);
  return cached.deckId;
}

/**
 * Store a deck in cache for a user and URL
 */
export async function cacheDeck(
  userId: string,
  url: string,
  deckId: string,
  contentHash?: string,
  processedContent?: ProcessedContent,
): Promise<void> {
  const urlHash = hashUrl(url);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

  await prisma.contentCache.upsert({
    where: {
      userId_urlHash: {
        userId,
        urlHash,
      },
    },
    update: {
      deckId,
      contentHash,
      processedContent,
      expiresAt,
    },
    create: {
      userId,
      urlHash,
      url,
      deckId,
      contentHash,
      processedContent,
      expiresAt,
    },
  });

  console.log(`[cache] STORED deckId=${deckId} for userId=${userId}, url=${url}, expiresAt=${expiresAt.toISOString()}`);
}

/**
 * Invalidate cache for a specific deck (when deck is edited)
 */
export async function invalidateDeckCache(deckId: string): Promise<void> {
  await prisma.contentCache.deleteMany({
    where: { deckId },
  });
}
