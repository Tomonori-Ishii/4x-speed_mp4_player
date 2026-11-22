import { describe, expect, it } from 'vitest';
import { formatVolume, gainFor } from '../../src/lib/volume';

describe('volume (FR-13, FR-14)', () => {
  it('maps the percentage to gain: 100% is original, 125% is 1.25x', () => {
    expect(gainFor(0)).toBe(0);
    expect(gainFor(100)).toBe(1);
    expect(gainFor(125)).toBe(1.25);
  });

  it('shows an integer percentage', () => {
    expect(formatVolume(0)).toBe('0%');
    expect(formatVolume(125)).toBe('125%');
  });
});
