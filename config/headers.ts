import { isDevelopment, isProduction } from 'std-env';
import parseDuration from 'parse-duration';

import type { HTTPMethod } from 'h3';

const SIX_MONTHS_IN_SECONDS = parseDuration('0.5 year', 'second')!;

export const CorsOrigin = process.env.NUXT_PUBLIC_SITE_ORIGIN || '*';
export const CorsMethods = ['GET', 'OPTIONS', 'PATCH', 'POST', 'DELETE'] satisfies Array<HTTPMethod>;
export const CorsHeaders = ['Origin', 'Content-Type', 'Accept'];

export const corsHeaders: Record<string, string | undefined> = {
  'Access-Control-Allow-Origin': CorsOrigin,
  'Access-Control-Allow-Methods': CorsMethods.join(', '),
  'Access-Control-Allow-Headers': CorsHeaders.join(', '),
  'Access-Control-Max-Age': parseDuration('24 hours', 's')?.toString(),
};

export const cspHeaders: Record<string, string | undefined> = {
  'Content-Security-Policy': [
    'default-src \'self\'',
    'connect-src \'self\' https:',
    'script-src \'self\' \'unsafe-inline\'',
    'style-src \'self\' \'unsafe-inline\'',
    'object-src \'none\'',
    'upgrade-insecure-requests',
  ].join('; '),
};

// basically helmet defaults with some customizations
export const defaultHeaders: Record<string, string | undefined> = {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Origin-Agent-Cluster': '?1',
  'X-DNS-Prefetch-Control': 'off',
  'X-Download-Options': 'noopen',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '0',
  'X-Robots-Tag': 'none',
  'Keep-Alive': '5',
  'Referrer-Policy': 'origin-when-cross-origin, strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Vary': 'Accept-Encoding, Accept, X-Requested-With, X-Authorized',
  ...(isProduction ? cspHeaders : {}),
};

export interface NoteViewHeaderOptions {
  isr: number
  /**
   * @default isr
   */
  staleWhileRevalidate?: number
}
export type HeadersType = 'default' | 'assets' | 'api' | 'api-info' | 'webmanifest';
export type HeadersOptions = NoteViewHeaderOptions | unknown;

export function getHeaders(
  headersOptions?: HeadersType | { type: HeadersType, opts: HeadersOptions },
): Record<string, string | undefined> {
  const type: HeadersType = typeof headersOptions === 'object'
    ? headersOptions.type
    : (headersOptions ?? 'default');

  const headers = { };

  if (isDevelopment)
    return headers;

  Object.assign(headers, defaultHeaders);

  if (type === 'assets') {
    const assetsCacheOptions: CacheControlHeaderOptions = {
      private: false,
      immutable: true,
      maxAge: SIX_MONTHS_IN_SECONDS,
      staleWhileRevalidate: SIX_MONTHS_IN_SECONDS,
    };

    Object.assign(headers, makeCacheControlHeader(assetsCacheOptions));

    assetsCacheOptions.CDN = true;

    Object.assign(headers, makeCacheControlHeader(assetsCacheOptions));
  }

  else if (type === 'api') {
    Object.assign(headers, corsHeaders);
    Object.assign(headers, makeCacheControlHeader({
      private: true,
      maxAge: 1,
    }));
  }

  else if (type === 'api-info') {
    Object.assign(headers, corsHeaders);
    Object.assign(headers, makeCacheControlHeader({
      private: false,
      maxAge: parseDuration('1 hour', 'second')!,
      staleWhileRevalidate: parseDuration('1 day', 'second')!,
      CDN: true,
    }));
  }

  else if (type === 'webmanifest') {
    Object.assign(headers, makeCacheControlHeader({
      private: true,
      maxAge: 0,
      mustRevalidate: true,
    }));
  }

  return headers;
}

export interface CacheControlHeaderOptions {
  private: boolean
  immutable?: boolean
  mustRevalidate?: boolean
  /**
   * in seconds
   */
  maxAge: number
  /**
   * in seconds
   */
  staleWhileRevalidate?: number
  CDN?: boolean | 'vc' | 'cf'
}
export function makeCacheControlHeader(opts: CacheControlHeaderOptions) {
  const values: Array<string> = [];

  values.push(opts.private ? 'private' : 'public');

  if (opts.immutable === true)
    values.push('immutable');

  values.push(`max-age=${opts.maxAge}`);

  if (opts.staleWhileRevalidate)
    values.push(`stale-while-revalidate=${opts.staleWhileRevalidate}`);

  if (opts.mustRevalidate)
    values.push(`must-revalidate`);

  const headerName = ['Cache', 'Control'];

  if (opts.CDN)
    headerName.unshift('CDN');

  if (opts.CDN === 'cf')
    headerName.unshift('Cloudflare');

  if (opts.CDN === 'vc')
    headerName.unshift('Vercel');

  return {
    [headerName.join('-')]: values.join(', '),
  };
}
