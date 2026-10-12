/**
 * Turns whatever an editor typed into a link, or undefined when it cannot be a link.
 * public/admin/helpers.js fixUrl is a line-for-line mirror (it keeps the typed text instead of
 * returning undefined). Change one, change both; test/links.test.ts runs both.
 */
export function toHref(raw?: string, kind?: 'instagram'): string | undefined {
  const value = (raw || '').trim();
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(mailto|tel):/i.test(value)) return value;
  if (kind === 'instagram') {
    const handle = value.replace(/^@/, '').replace(/^(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '');
    if (/^[A-Za-z0-9._]{1,30}$/.test(handle)) return `https://instagram.com/${handle}`;
  }
  if (!/\s/.test(value) && value.includes('.')) return `https://${value.replace(/^\/+/, '')}`;
  return undefined;
}
