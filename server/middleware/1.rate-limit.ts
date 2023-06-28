// @ts-expect-error specifying * as RateLimiter breaks everything
import RateLimiter from 'lambda-rate-limiter';
import parseDuration from 'parse-duration';

import type { RateLimiter as RateLimiterI } from 'lambda-rate-limiter';

const INTERVAL = parseDuration('1 minute')!;
const LIMIT = Math.floor((INTERVAL * 2) / 1000); // two per second

// NOTE: https://lihbr.com/posts/rate-limiting-without-overhead-netlify-or-vercel-functions
// cool article that describes problem about rate limiting in serverless functions
export default defineEventHandler(async (event) => {
  if (event.path?.startsWith('/api')) {
    const rateLimit = getRateLimiter();
    const identifier = getHeader(event, 'x-real-ip')
      || getHeader(event, 'client-ip')
      || getHeader(event, 'x-forwarded-for');

    const used = await rateLimit(LIMIT, identifier!).catch(() => LIMIT + LIMIT);

    if (used > LIMIT) {
      event.context.logger.log('warn', 'rate limit exceeded', { path: event.path, identifier });

      return createError({
        statusCode: 429,
        statusMessage: 'Too many requests',
      });
    }

    setHeader(event, 'X-RateLimit-Limit', LIMIT.toString());
    setHeader(event, 'X-RateLimit-Remaining', (LIMIT - used).toString());
  }
});

function getRateLimiter() {
  if (!globalThis.rateLimiter) {
    globalThis.rateLimiter = RateLimiter({
      interval: INTERVAL,
      uniqueTokenPerInterval: LIMIT,
    });
  }

  return globalThis.rateLimiter.check;
}

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var rateLimiter: RateLimiterI;
}
