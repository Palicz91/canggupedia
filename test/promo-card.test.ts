import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Ivan types promo text in the admin with line breaks and blank lines (emoji lists, short
// paragraphs). The JSON keeps them, so the card must not squeeze them into one block.
describe('PromoCard description', () => {
  const src = readFileSync('src/components/PromoCard.astro', 'utf8');

  it('keeps the line breaks typed in the admin', () => {
    const line = src.split('\n').find((l) => l.includes('promo.description'));
    expect(line).toBeDefined();
    expect(line).toContain('whitespace-pre-line');
  });
});
