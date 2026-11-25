import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { cueAt, decodeTx3gSample, normalizeCues, readTx3gCues, type SubtitleCue } from '../../src/lib/subtitles';

const cue = (start: number, end: number, text: string): SubtitleCue => ({ start, end, text });

describe('decodeTx3gSample', () => {
  it('reads the 16-bit length and the UTF-8 text that follows', () => {
    const text = new TextEncoder().encode('はい');
    const bytes = new Uint8Array([0, text.length, ...text]);
    expect(decodeTx3gSample(bytes)).toBe('はい');
  });

  it('returns an empty string for an empty sample', () => {
    expect(decodeTx3gSample(new Uint8Array([0, 0]))).toBe('');
    expect(decodeTx3gSample(new Uint8Array([]))).toBe('');
  });

  it('ignores bytes after the declared length (styling boxes)', () => {
    const text = new TextEncoder().encode('ab');
    expect(decodeTx3gSample(new Uint8Array([0, 2, ...text, 0, 0, 0, 8, 0x73, 0x74, 0x79, 0x6c]))).toBe('ab');
  });
});

describe('normalizeCues', () => {
  it('trims text and drops empty or zero-length cues', () => {
    const out = normalizeCues([cue(0, 1, '  '), cue(1, 2, ' hi\n '), cue(2, 2, 'zero'), cue(2, 3, '')]);
    expect(out).toEqual([cue(1, 2, 'hi')]);
  });

  it('merges adjacent cues with the same text (rolling auto captions)', () => {
    const out = normalizeCues([cue(0, 3, 'a'), cue(3, 3.01, 'a'), cue(3.01, 5, 'a'), cue(5, 6, 'b')]);
    expect(out).toEqual([cue(0, 5, 'a'), cue(5, 6, 'b')]);
  });

  it('keeps repeated text that is separated by a gap', () => {
    const out = normalizeCues([cue(0, 1, 'a'), cue(2, 3, 'a')]);
    expect(out).toHaveLength(2);
  });
});

describe('cueAt', () => {
  const cues = [cue(1, 2, 'a'), cue(3, 4, 'b'), cue(4, 6, 'c')];

  it('returns the cue whose [start, end) contains t', () => {
    expect(cueAt(cues, 1)?.text).toBe('a');
    expect(cueAt(cues, 1.99)?.text).toBe('a');
    expect(cueAt(cues, 4)?.text).toBe('c');
    expect(cueAt(cues, 5.5)?.text).toBe('c');
  });

  it('returns null between cues, before the first and after the last', () => {
    expect(cueAt(cues, 0)).toBeNull();
    expect(cueAt(cues, 2.5)).toBeNull();
    expect(cueAt(cues, 6)).toBeNull();
    expect(cueAt([], 1)).toBeNull();
  });
});

// Optional integration check against a real file with a tx3g track.
// Set SUBTITLE_SAMPLE to an absolute path; the test is skipped otherwise.
const samplePath = process.env.SUBTITLE_SAMPLE;
describe.skipIf(!samplePath || !existsSync(samplePath))('readTx3gCues (real file)', () => {
  it('extracts the subtitle samples with times in seconds', async () => {
    const buf = readFileSync(samplePath as string);
    const data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    const cues = normalizeCues(await readTx3gCues(data));
    expect(cues.length).toBeGreaterThan(100);
    expect(cues[0].start).toBeCloseTo(0.28, 2);
    expect(cues.every((c) => c.end > c.start && c.text.length > 0)).toBe(true);
  }, 120_000);
});
