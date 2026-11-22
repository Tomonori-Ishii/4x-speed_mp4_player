// Playback speed: 1.00x to 4.00x in 0.25 steps (FR-06, FR-07, OQ-10, OQ-11).

export const MIN_SPEED = 1;
export const MAX_SPEED = 4;
export const DEFAULT_SPEED = 1;

const STEPS_PER_UNIT = 4; // 0.25 steps

/**
 * Returns the next speed one step up (dir = 1) or down (dir = -1), clamped to
 * [MIN_SPEED, MAX_SPEED]. Computed on an integer grid to avoid float drift.
 */
export function stepSpeed(current: number, dir: 1 | -1): number {
  const index = Math.round(current * STEPS_PER_UNIT) + dir;
  const minIndex = MIN_SPEED * STEPS_PER_UNIT;
  const maxIndex = MAX_SPEED * STEPS_PER_UNIT;
  return Math.min(maxIndex, Math.max(minIndex, index)) / STEPS_PER_UNIT;
}

export function canSlower(speed: number): boolean {
  return speed > MIN_SPEED;
}

export function canFaster(speed: number): boolean {
  return speed < MAX_SPEED;
}

/** `1.00x`, `3.25x` (two decimals, followed by x). */
export function formatSpeed(speed: number): string {
  return `${speed.toFixed(2)}x`;
}
