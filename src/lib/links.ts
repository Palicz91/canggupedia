export function toHref(raw?: string, kind?: 'instagram'): string | undefined {
  const value = (raw || '').trim();
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (kind === 'instagram') {
    const handle = value.replace(/^@/, '').replace(/^(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '');
    if (handle && !/[.\s]/.test(handle)) return `https://instagram.com/${handle}`;
  }
  return `https://${value.replace(/^\/+/, '')}`;
}
