import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../../src/lib/messages';

describe('messages (NFR-10, OQ-23)', () => {
  it('uses the exact English texts from OQ-23', () => {
    expect(MESSAGES.dropHint).toBe('Drop an MP4 file here');
    expect(MESSAGES.loading).toBe('Loading…');
    expect(MESSAGES.notLowercaseMp4).toBe('Only lowercase .mp4 files can be played.');
    expect(MESSAGES.unplayable).toBe('Unplayable data');
    expect(MESSAGES.firstOfMany(3)).toBe('Only the first of 3 files is played.');
    expect(MESSAGES.dropOverlay).toBe('Drop to play');
    expect(MESSAGES.appTitle).toBe('4x-speed-mp4-player');
  });

  it('contains no Japanese characters', () => {
    const texts = Object.values(MESSAGES).map((v) => (typeof v === 'function' ? v(2) : v));
    for (const text of texts) {
      expect(text).not.toMatch(/[぀-ヿ㐀-鿿＀-￯]/);
    }
  });
});
