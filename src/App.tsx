import { useCallback, useEffect, useRef, useState } from 'react';
import { Controls } from './components/Controls';
import { DropOverlay } from './components/DropOverlay';
import { MessageBar } from './components/MessageBar';
import { VideoArea } from './components/VideoArea';
import { selectDroppedFile, type DropItemLike } from './lib/dropItems';
import { clampSpecifiedWidth, computeDisplaySize, type Size } from './lib/layout';
import { usePlayer } from './hooks/usePlayer';
import { cueAt } from './lib/subtitles';

const hasFiles = (e: DragEvent): boolean => Array.from(e.dataTransfer?.types ?? []).includes('Files');

/** Converts the drop's DataTransfer into the items the selection rules need (OQ-35). */
function toDropItems(dt: DataTransfer): DropItemLike[] {
  if (dt.items.length > 0) {
    return Array.from(dt.items).map((item) => ({
      kind: item.kind,
      isDirectory: () => item.webkitGetAsEntry()?.isDirectory ?? false,
      getFile: () => item.getAsFile(),
    }));
  }
  return Array.from(dt.files).map((file) => ({
    kind: 'file',
    isDirectory: () => false,
    getFile: () => file,
  }));
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const player = usePlayer(videoRef);
  const [area, setArea] = useState<Size>({ width: 0, height: 0 });
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  const [specifiedWidth, setSpecifiedWidth] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [subtitlesOn, setSubtitlesOn] = useState(true); // spike

  // Keep the latest loader for the window-level listeners below.
  const loadRef = useRef(player.loadFile);
  loadRef.current = player.loadFile;

  const onMeasure = useCallback((size: Size) => setArea(size), []);

  // FR-09: until a video is loaded, the specified width is the video area width.
  useEffect(() => {
    if (player.status === 'ready' && specifiedWidth === null && area.width > 0) {
      setSpecifiedWidth(area.width);
    }
  }, [player.status, specifiedWidth, area.width]);

  useEffect(() => {
    const onResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Drag and drop on the whole window (FR-01, FR-19). Capture phase so that the
  // default "open the file" navigation is always stopped (NFR-08).
  useEffect(() => {
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const onLeave = () => {
      // Count only the enters that showed the overlay (file drags).
      if (dragDepth.current === 0) return;
      dragDepth.current -= 1;
      if (dragDepth.current === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (!e.dataTransfer || !hasFiles(e)) return;
      const pick = selectDroppedFile(toDropItems(e.dataTransfer));
      if (pick) loadRef.current(pick.file, pick.count);
    };
    window.addEventListener('dragenter', onEnter, true);
    window.addEventListener('dragover', onOver, true);
    window.addEventListener('dragleave', onLeave, true);
    window.addEventListener('drop', onDrop, true);
    return () => {
      window.removeEventListener('dragenter', onEnter, true);
      window.removeEventListener('dragover', onOver, true);
      window.removeEventListener('dragleave', onLeave, true);
      window.removeEventListener('drop', onDrop, true);
    };
  }, []);

  const display = computeDisplaySize({
    videoWidth: player.videoSize.width,
    videoHeight: player.videoSize.height,
    specifiedWidth: specifiedWidth ?? area.width,
    areaWidth: area.width,
    areaHeight: area.height,
    windowHeight,
  });

  const onResizeTo = (requested: number): void => {
    // The maximum is the width of the display the window is on (OQ-05, OQ-36).
    setSpecifiedWidth(clampSpecifiedWidth(requested, window.screen.width));
  };

  const onChooseFile = (): void => {
    inputRef.current?.click();
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (file) player.loadFile(file, 1);
  };

  return (
    <main
      className="app"
      data-testid="app"
      data-status={player.status}
      data-gain={player.gainValue}
    >
      <Controls
        status={player.status}
        playing={player.playing}
        currentTime={player.currentTime}
        duration={player.duration}
        speed={player.speed}
        volume={player.volume}
        loop={player.loop}
        onTogglePlay={player.togglePlay}
        onSeek={player.seek}
        onSlower={() => player.stepSpeedBy(-1)}
        onFaster={() => player.stepSpeedBy(1)}
        onVolumeChange={player.setVolume}
        onToggleLoop={() => player.setLoop(!player.loop)}
        onChooseFile={onChooseFile}
      />
      <MessageBar message={player.message} />
      <VideoArea
        videoRef={videoRef}
        status={player.status}
        display={display}
        displayWidth={display.width}
        mediaHandlers={player.mediaHandlers}
        onMeasure={onMeasure}
        onVideoClick={player.togglePlay}
        onResizeTo={onResizeTo}
        subtitle={subtitlesOn ? (cueAt(player.cues, player.currentTime)?.text ?? null) : null}
        hasSubtitles={player.cues.length > 0}
        subtitlesOn={subtitlesOn}
        onToggleSubtitles={() => setSubtitlesOn((on) => !on)}
      />
      <DropOverlay visible={dragging && player.status !== 'loading'} />
      <input
        ref={inputRef}
        type="file"
        accept=".mp4"
        hidden
        onChange={onInputChange}
        data-testid="file-input"
      />
    </main>
  );
}
