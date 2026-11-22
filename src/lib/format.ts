// Time formatting (FR-05, OQ-34).

const pad2 = (n: number): string => n.toString().padStart(2, '0');

/**
 * Formats a finite number of seconds as `m:ss`, or `h:mm:ss` from one hour on.
 * Negative or non-finite input is treated as 0.
 */
export function formatTime(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}

/** Total duration: `--:--` when the duration is unknown (NaN or infinite). */
export function formatTotal(duration: number): string {
  return Number.isFinite(duration) ? formatTime(duration) : '--:--';
}
