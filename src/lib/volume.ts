// Volume: 0% to 125%, default 0% (FR-13, FR-14, OQ-04).

export const MIN_VOLUME = 0;
export const MAX_VOLUME = 125;
export const DEFAULT_VOLUME = 0;

/** Gain for the Web Audio GainNode: 100% is the original level, 125% is 1.25x. */
export function gainFor(volumePercent: number): number {
  return volumePercent / 100;
}

/** `125%` */
export function formatVolume(volumePercent: number): string {
  return `${volumePercent}%`;
}
