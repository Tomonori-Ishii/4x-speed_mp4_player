import { MESSAGES } from '../lib/messages';
import { formatTime, formatTotal } from '../lib/format';
import { canFaster, canSlower, formatSpeed } from '../lib/speed';
import { formatVolume, MAX_VOLUME, MIN_VOLUME } from '../lib/volume';
import type { PlayerStatus } from '../hooks/usePlayer';

export interface ControlsProps {
  status: PlayerStatus;
  playing: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  volume: number;
  loop: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSlower: () => void;
  onFaster: () => void;
  onVolumeChange: (value: number) => void;
  onToggleLoop: () => void;
  onChooseFile: () => void;
}

/** Class for a control that is unavailable: it is drawn in a lighter color (FR-16, OQ-15). */
const unavailable = (disabled: boolean): string => (disabled ? 'is-unavailable' : '');

export function Controls(props: ControlsProps) {
  const { status, playing, currentTime, duration, speed, volume, loop } = props;
  const ready = status === 'ready';
  const seekable = ready && Number.isFinite(duration) && duration > 0; // OQ-34
  const loading = status === 'loading';

  const timeText = ready
    ? `${formatTime(currentTime)} / ${formatTotal(duration)}`
    : `${formatTime(0)} / ${formatTime(0)}`;

  const playDisabled = !ready;
  const seekDisabled = !seekable;
  const slowerDisabled = !ready || !canSlower(speed);
  const fasterDisabled = !ready || !canFaster(speed);
  const volumeDisabled = !ready;

  return (
    <section className="controls" aria-label="Playback controls">
      <div className="row">
        <button
          type="button"
          className={`btn play ${unavailable(playDisabled)}`}
          onClick={props.onTogglePlay}
          disabled={playDisabled}
        >
          {playing ? MESSAGES.pause : MESSAGES.play}
        </button>
        <input
          type="range"
          className={`seek ${unavailable(seekDisabled)}`}
          aria-label={MESSAGES.seek}
          min={0}
          max={seekable ? duration : 0}
          step={0.1}
          value={seekable ? Math.min(currentTime, duration) : 0}
          disabled={seekDisabled}
          onChange={(e) => props.onSeek(Number(e.target.value))}
        />
        <span className="time">{timeText}</span>
      </div>
      <div className="row">
        <button
          type="button"
          className={`btn ${unavailable(slowerDisabled)}`}
          onClick={props.onSlower}
          disabled={slowerDisabled}
        >
          {MESSAGES.slower}
        </button>
        <span className="speed">{formatSpeed(speed)}</span>
        <button
          type="button"
          className={`btn ${unavailable(fasterDisabled)}`}
          onClick={props.onFaster}
          disabled={fasterDisabled}
        >
          {MESSAGES.faster}
        </button>
        <label className="volume-label" htmlFor="volume">
          {MESSAGES.volume}
        </label>
        <input
          id="volume"
          type="range"
          className={`volume ${unavailable(volumeDisabled)}`}
          min={MIN_VOLUME}
          max={MAX_VOLUME}
          step={1}
          value={volume}
          disabled={volumeDisabled}
          onChange={(e) => props.onVolumeChange(Number(e.target.value))}
        />
        <span className="volume-value">{formatVolume(volume)}</span>
        <button
          type="button"
          className={`btn loop ${loop ? 'is-on' : ''}`}
          aria-pressed={loop}
          onClick={props.onToggleLoop}
        >
          {MESSAGES.loop}
        </button>
        <button
          type="button"
          className={`btn ${unavailable(loading)}`}
          onClick={props.onChooseFile}
          disabled={loading}
        >
          {MESSAGES.chooseFile}
        </button>
      </div>
    </section>
  );
}
