import { describe, it, expect } from 'vitest';
import { cdnImage } from '../src/lib/images';

describe('cdnImage', () => {
  it('routes site-relative paths through the Netlify CDN on Netlify', () => {
    expect(cdnImage('/images/x.png', 640, true)).toBe('/.netlify/images?url=%2Fimages%2Fx.png&w=640');
  });
  it('leaves everything unchanged off Netlify', () => {
    expect(cdnImage('/images/x.png', 640, false)).toBe('/images/x.png');
  });
  it('leaves absolute, protocol-relative and empty sources alone', () => {
    expect(cdnImage('https://a.com/x.png', 640, true)).toBe('https://a.com/x.png');
    expect(cdnImage('//a.com/x.png', 640, true)).toBe('//a.com/x.png');
    expect(cdnImage('', 640, true)).toBe('');
    expect(cdnImage(undefined, 640, true)).toBe('');
  });
  it('caps the width at 1200 and encodes odd characters', () => {
    expect(cdnImage('/images/a b.png', 5000, true)).toBe('/.netlify/images?url=%2Fimages%2Fa%20b.png&w=1200');
  });
});
