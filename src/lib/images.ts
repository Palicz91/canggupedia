/**
 * Routes a site-relative image through the Netlify Image CDN (resized, modern format) when the
 * build runs on Netlify. Anywhere else (local builds, e2e, absolute URLs, empty) the source is
 * returned unchanged. `onNetlify` is injectable for tests; pass the same build-time value on the
 * server and in the browser so hydration produces identical markup.
 */
export function cdnImage(
  src: string | undefined,
  width: number,
  onNetlify: boolean = typeof process !== 'undefined' && process.env?.NETLIFY === 'true',
): string {
  const value = (src || '').trim();
  if (!value) return value;
  if (!onNetlify || !value.startsWith('/') || value.startsWith('//')) return value;
  const w = Math.min(1200, Math.max(1, Math.round(width)));
  return `/.netlify/images?url=${encodeURIComponent(value)}&w=${w}`;
}
