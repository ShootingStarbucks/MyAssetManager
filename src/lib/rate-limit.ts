/**
 * IP-based sliding window rate limiter (in-memory, no external dependencies).
 *
 * NOTE: This is per-process memory. In multi-instance deployments each instance
 * maintains its own window. For a single-node Next.js app this is sufficient.
 */

interface WindowEntry {
  /** Timestamps (ms) of requests within the current window */
  timestamps: number[];
}

// Global store: key -> window entry
const store = new Map<string, WindowEntry>();

// Prune entries older than this to prevent unbounded memory growth (1 hour)
const MAX_ENTRY_AGE_MS = 60 * 60 * 1000;

let lastPruneAt = Date.now();

function pruneStale(windowMs: number): void {
  const now = Date.now();
  // Only prune at most once per minute
  if (now - lastPruneAt < 60_000) return;
  lastPruneAt = now;

  const cutoff = now - Math.max(windowMs, MAX_ENTRY_AGE_MS);
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitResult {
  success: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Milliseconds until the oldest request falls out of the window */
  retryAfterMs: number;
}

export interface RateLimiterOptions {
  /** Window size in milliseconds */
  windowMs: number;
  /** Maximum number of requests allowed per window */
  max: number;
}

/**
 * Check whether the given key (typically an IP address) is within the rate limit.
 *
 * @param key      - Unique identifier for the requester (e.g. IP address)
 * @param options  - { windowMs, max }
 */
export function rateLimit(key: string, options: RateLimiterOptions): RateLimitResult {
  const { windowMs, max } = options;
  const now = Date.now();
  const cutoff = now - windowMs;

  pruneStale(windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Drop timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= max) {
    // Oldest timestamp in window; once it drops out the client may retry
    const oldest = entry.timestamps[0];
    const retryAfterMs = oldest + windowMs - now;
    return { success: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  entry.timestamps.push(now);
  const remaining = max - entry.timestamps.length;
  return { success: true, remaining, retryAfterMs: 0 };
}

/**
 * Extract the best-effort client IP from a Next.js request.
 * Falls back to 'unknown' if no IP can be determined.
 */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

/** Convenience: build a 429 response body */
export function rateLimitExceededResponse(): { error: string } {
  return { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' };
}
