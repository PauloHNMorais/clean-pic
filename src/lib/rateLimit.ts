import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/image/validation";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Module-scope Map, not a shared store — this only limits requests hitting
// the same warm serverless instance. On Vercel that means it's a soft
// deterrent (raises the bar for casual/scripted abuse), not a hard guarantee:
// cold starts reset it, and multiple concurrent instances each count
// independently. Fine for this app's threat model; upgrade to Vercel
// Firewall or a shared store (e.g. Upstash) if abuse becomes a real problem.
const requestCounts = new Map<string, RateLimitEntry>();

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(identifier);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}
