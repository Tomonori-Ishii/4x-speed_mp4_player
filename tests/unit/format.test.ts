import { describe, expect, it } from 'vitest';
import { formatTime, formatTotal } from '../../src/lib/format';

describe('formatTime (FR-05)', () => {
  it.each([
    [0, '0:00'],
    [59.9, '0:59'],
    [61, '1:01'],
    [599, '9:59'],
    [3599, '59:59'],
    [3600, '1:00:00'],
    [3723.4, '1:02:03'],
  ])('formats %s seconds as %s', (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected);
  });

  it('treats NaN and negative values as 0', () => {
    expect(formatTime(Number.NaN)).toBe('0:00');
    expect(formatTime(-5)).toBe('0:00');
  });

  it('shows --:-- for an unknown total (OQ-34)', () => {
    expect(formatTotal(Number.NaN)).toBe('--:--');
    expect(formatTotal(Number.POSITIVE_INFINITY)).toBe('--:--');
    expect(formatTotal(61)).toBe('1:01');
  });
});
