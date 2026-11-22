import { describe, expect, it } from 'vitest';
import { canFaster, canSlower, formatSpeed, stepSpeed } from '../../src/lib/speed';

describe('stepSpeed (FR-06, OQ-10)', () => {
  it('moves by 0.25 within 1.00 to 4.00', () => {
    expect(stepSpeed(1, 1)).toBe(1.25);
    expect(stepSpeed(1.25, -1)).toBe(1);
  });

  it('clamps at the upper limit 4.00 and the lower limit 1.00', () => {
    expect(stepSpeed(4, 1)).toBe(4);
    expect(stepSpeed(1, -1)).toBe(1);
  });

  it('has no float drift over many steps', () => {
    let speed = 1;
    for (let i = 0; i < 12; i++) speed = stepSpeed(speed, 1);
    expect(speed).toBe(4);
    for (let i = 0; i < 12; i++) speed = stepSpeed(speed, -1);
    expect(speed).toBe(1);
  });

  it('tells when the buttons must be disabled (AT-05)', () => {
    expect(canSlower(1)).toBe(false);
    expect(canSlower(1.25)).toBe(true);
    expect(canFaster(4)).toBe(false);
    expect(canFaster(3.75)).toBe(true);
  });
});

describe('formatSpeed (FR-07)', () => {
  it('shows two decimals followed by x', () => {
    expect(formatSpeed(1)).toBe('1.00x');
    expect(formatSpeed(3.25)).toBe('3.25x');
    expect(formatSpeed(4)).toBe('4.00x');
  });
});
