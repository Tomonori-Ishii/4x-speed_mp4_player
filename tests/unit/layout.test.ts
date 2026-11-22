import { describe, expect, it } from 'vitest';
import { clampSpecifiedWidth, computeDisplaySize } from '../../src/lib/layout';

const landscape = { videoWidth: 1920, videoHeight: 1080 };

describe('computeDisplaySize (FR-09, FR-10, OQ-19)', () => {
  it('fits a 16:9 video into a 960x540 area and keeps the ratio (AT-07)', () => {
    const size = computeDisplaySize({
      ...landscape,
      specifiedWidth: 2000,
      areaWidth: 960,
      areaHeight: 540,
      windowHeight: 540,
    });
    expect(size.width).toBeCloseTo(960);
    expect(size.height).toBeCloseTo(540);
  });

  it('never exceeds the specified width (AT-08: shrinks with the window, grows back)', () => {
    const shrunk = computeDisplaySize({
      ...landscape,
      specifiedWidth: 800,
      areaWidth: 400,
      areaHeight: 225,
      windowHeight: 300,
    });
    expect(shrunk.width).toBeCloseTo(400);
    const back = computeDisplaySize({
      ...landscape,
      specifiedWidth: 800,
      areaWidth: 1000,
      areaHeight: 600,
      windowHeight: 700,
    });
    expect(back.width).toBeCloseTo(800);
    expect(back.height).toBeCloseTo(450);
  });

  it('limits a portrait video to 70% of the window height (FR-10)', () => {
    const size = computeDisplaySize({
      videoWidth: 1080,
      videoHeight: 1920,
      specifiedWidth: 1000,
      areaWidth: 1000,
      areaHeight: 2000,
      windowHeight: 900,
    });
    expect(size.height).toBeLessThanOrEqual(900 * 0.7 + 1e-6);
    expect(size.height / size.width).toBeCloseTo(1920 / 1080);
  });

  it('does not apply the 70% limit to a landscape video', () => {
    const size = computeDisplaySize({
      ...landscape,
      specifiedWidth: 1000,
      areaWidth: 1000,
      areaHeight: 1000,
      windowHeight: 500,
    });
    expect(size.width).toBeCloseTo(1000);
  });

  it('returns zero size without a video', () => {
    expect(
      computeDisplaySize({ videoWidth: 0, videoHeight: 0, specifiedWidth: 500, areaWidth: 500, areaHeight: 500, windowHeight: 500 }),
    ).toEqual({ width: 0, height: 0 });
  });
});

describe('clampSpecifiedWidth (FR-09, OQ-39)', () => {
  it('keeps the width between 160 and the display width (AT-35)', () => {
    expect(clampSpecifiedWidth(100, 1920)).toBe(160);
    expect(clampSpecifiedWidth(3000, 1920)).toBe(1920);
    expect(clampSpecifiedWidth(500, 1920)).toBe(500);
  });

  it('prefers 160 when the display is narrower than 160 (OQ-39)', () => {
    expect(clampSpecifiedWidth(300, 150)).toBe(160);
  });
});
