import { useEffect, useRef, type PointerEvent, type RefObject, type VideoHTMLAttributes } from 'react';
import { MESSAGES } from '../lib/messages';
import type { PlayerStatus } from '../hooks/usePlayer';
import type { Size } from '../lib/layout';

export type MediaHandlers = Pick<
  VideoHTMLAttributes<HTMLVideoElement>,
  | 'onLoadedMetadata'
  | 'onLoadedData'
  | 'onError'
  | 'onPlay'
  | 'onPause'
  | 'onEnded'
  | 'onTimeUpdate'
  | 'onDurationChange'
>;

export interface VideoAreaProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: PlayerStatus;
  /** Size of the video on screen (computed by the caller). */
  display: Size;
  /** Current displayed width; the resize drag starts from it. */
  displayWidth: number;
  mediaHandlers: MediaHandlers;
  onMeasure: (size: Size) => void;
  onVideoClick: () => void;
  /** Called during a resize drag with the requested width (logical px). */
  onResizeTo: (width: number) => void;
}

/**
 * The area below the controls and the message line. It holds the single
 * <video> element (always mounted so that its listeners and ref stay valid),
 * the placeholder texts, and the bottom-right resize handle.
 */
export function VideoArea(props: VideoAreaProps) {
  const { videoRef, status, display, displayWidth, onMeasure, onResizeTo } = props;
  const areaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const ready = status === 'ready';

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const observer = new ResizeObserver(([entry]) => {
      onMeasure({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, [onMeasure]);

  const onHandleDown = (e: PointerEvent<HTMLDivElement>): void => {
    if (!ready) return;
    dragRef.current = { startX: e.clientX, startWidth: displayWidth };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onHandleMove = (e: PointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current;
    if (!drag) return;
    onResizeTo(drag.startWidth + (e.clientX - drag.startX));
  };

  const onHandleUp = (): void => {
    dragRef.current = null;
  };

  const resizeHandle = (
    <div
      className={`handle ${ready ? '' : 'is-unavailable'}`}
      role="slider"
      aria-label={MESSAGES.resizeHandle}
      aria-valuenow={Math.round(display.width)}
      aria-valuemin={160}
      aria-disabled={!ready}
      onPointerDown={onHandleDown}
      onPointerMove={onHandleMove}
      onPointerUp={onHandleUp}
      onPointerCancel={onHandleUp}
    />
  );

  return (
    <div className="video-area" ref={areaRef}>
      {status === 'initial' && <p className="hint">{MESSAGES.dropHint}</p>}
      {status === 'loading' && <p className="hint">{MESSAGES.loading}</p>}
      <div className="stage" hidden={!ready} style={{ width: display.width, height: display.height }}>
        <video
          ref={videoRef}
          className="video"
          playsInline
          preload="auto"
          onClick={props.onVideoClick}
          {...props.mediaHandlers}
        />
        {ready && resizeHandle}
      </div>
      {/* Without a video the handle stays visible, unavailable, in the area corner (FR-16). */}
      {!ready && resizeHandle}
    </div>
  );
}
