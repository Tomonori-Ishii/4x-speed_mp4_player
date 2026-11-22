import { describe, expect, it } from 'vitest';
import { isPlayableFileName } from '../../src/lib/fileRules';

describe('isPlayableFileName (FR-02, OQ-16)', () => {
  it.each(['a.mp4', 'my video.mp4', 'x.y.mp4'])('accepts %s', (name) => {
    expect(isPlayableFileName(name)).toBe(true);
  });

  it.each(['A.MP4', 'a.m4v', 'a.mov', 'a.Mp4', '.mp4', 'a.mp4.txt', 'mp4', ''])('rejects %s', (name) => {
    expect(isPlayableFileName(name)).toBe(false);
  });
});
