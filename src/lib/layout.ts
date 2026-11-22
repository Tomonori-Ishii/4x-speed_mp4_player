// Display size of the video (FR-09, FR-10, OQ-05, OQ-18, OQ-19, OQ-39).

export const MIN_SPECIFIED_WIDTH = 160;
export const PORTRAIT_MAX_HEIGHT_RATIO = 0.7;

export interface Size {
  width: number;
  height: number;
}

export interface DisplaySizeInput {
  videoWidth: number;
  videoHeight: number;
  /** Specified width in logical pixels (the user-chosen width). */
  specifiedWidth: number;
  /** Video area (the space below the controls and the message line). */
  areaWidth: number;
  areaHeight: number;
  /** Window inner height; the 70% limit for portrait videos uses it (OQ-18). */
  windowHeight: number;
}

/**
 * Clamps a requested width to [160, display width]. When the display is
 * narrower than 160px, 160px wins (OQ-39).
 */
export function clampSpecifiedWidth(requested: number, displayWidth: number): number {
  return Math.max(MIN_SPECIFIED_WIDTH, Math.min(requested, displayWidth));
}

/**
 * OQ-19:
 *   width  = min(specified, area width, area height * vw / vh,
 *                portrait only: window height * 0.7 * vw / vh)
 *   height = width / vw * vh
 * The video keeps its aspect ratio; the window size is not changed by this.
 */
export function computeDisplaySize(input: DisplaySizeInput): Size {
  const { videoWidth: vw, videoHeight: vh } = input;
  if (vw <= 0 || vh <= 0) {
    return { width: 0, height: 0 };
  }
  let width = Math.min(
    input.specifiedWidth,
    input.areaWidth,
    (input.areaHeight * vw) / vh,
  );
  if (vh > vw) {
    width = Math.min(width, (input.windowHeight * PORTRAIT_MAX_HEIGHT_RATIO * vw) / vh);
  }
  width = Math.max(0, width);
  return { width, height: (width / vw) * vh };
}
