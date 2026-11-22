import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { isPlayableFileName } from '../lib/fileRules';
import { MESSAGES } from '../lib/messages';
import { DEFAULT_SPEED, stepSpeed } from '../lib/speed';
import { DEFAULT_VOLUME, gainFor } from '../lib/volume';

/**
 * initial: nothing loaded yet (launch).   loading: a file is being read.
 * ready:   a video is loaded (controls work).   failed: unplayable; video area empty.
 */
export type PlayerStatus = 'initial' | 'loading' | 'ready' | 'failed';

interface AudioChain {
  ctx: AudioContext;
  gain: GainNode;
}

/**
 * Owns the single <video> element and everything that drives it:
 * loading (FR-01, FR-02, FR-11, FR-12), playback (FR-03, FR-04), speed (FR-06),
 * volume through a GainNode (FR-13), loop (FR-21) and cleanup (NFR-04).
 * The element is reused for every file; only its src changes.
 */
export function usePlayer(videoRef: RefObject<HTMLVideoElement | null>) {
  const [status, setStatusState] = useState<PlayerStatus>('initial');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(Number.NaN);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [speed, setSpeedState] = useState(DEFAULT_SPEED);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [loop, setLoopState] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Refs mirror state for use inside event handlers and the drop listener.
  const statusRef = useRef<PlayerStatus>('initial');
  const busyRef = useRef(false); // true while a file is being read
  const objectUrlRef = useRef<string | null>(null);
  const resumeAfterLoadRef = useRef(false);
  const volumeRef = useRef(DEFAULT_VOLUME);
  const audioRef = useRef<AudioChain | null>(null);

  const setStatus = useCallback((next: PlayerStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  /** Revokes the Object URL and detaches the source from the element. */
  const releaseSource = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.removeAttribute('src');
      video.load();
    }
  }, [videoRef]);

  /** Creates the Web Audio chain once per element; must run from a user gesture (Play). */
  const ensureAudio = useCallback((): void => {
    const video = videoRef.current;
    if (!audioRef.current) {
      if (!video || typeof window.AudioContext === 'undefined') return;
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(video);
      const gain = ctx.createGain();
      gain.gain.value = gainFor(volumeRef.current);
      source.connect(gain);
      gain.connect(ctx.destination);
      audioRef.current = { ctx, gain };
    }
    if (audioRef.current.ctx.state === 'suspended') {
      void audioRef.current.ctx.resume();
    }
  }, [videoRef]);

  const failLoad = useCallback((): void => {
    busyRef.current = false;
    resumeAfterLoadRef.current = false;
    releaseSource();
    setPlaying(false);
    setCurrentTime(0);
    setDuration(Number.NaN);
    setVideoSize({ width: 0, height: 0 });
    setStatus('failed');
    setMessage(MESSAGES.unplayable);
  }, [releaseSource, setStatus]);

  /**
   * Starts loading a dropped or chosen file. `count` is the number of dropped
   * files (1 for the file picker). Ignored while a file is being read (FR-12).
   */
  const loadFile = useCallback(
    (file: File, count: number): void => {
      if (busyRef.current) return;
      if (!isPlayableFileName(file.name)) {
        // FR-02: reject without touching the current video.
        setMessage(MESSAGES.notLowercaseMp4);
        return;
      }
      const video = videoRef.current;
      if (!video) return;

      busyRef.current = true;
      // Replacing a video keeps the playing state (FR-12, OQ-32).
      resumeAfterLoadRef.current = statusRef.current === 'ready' && !video.paused && !video.ended;
      // AT-17 / AT-38: clear the old message, then show the notice for several files.
      setMessage(count >= 2 ? MESSAGES.firstOfMany(count) : null);
      releaseSource(); // NFR-04: the old Object URL is released only after FR-02 passed.

      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setPlaying(false);
      setCurrentTime(0);
      setDuration(Number.NaN);
      setVideoSize({ width: 0, height: 0 });
      setStatus('loading');
      video.src = url;
    },
    [releaseSource, setStatus, videoRef],
  );

  const togglePlay = useCallback((): void => {
    const video = videoRef.current;
    if (!video || statusRef.current !== 'ready') return;
    if (video.paused) {
      ensureAudio();
      video.play().catch(() => {
        setPlaying(false);
      });
    } else {
      video.pause();
    }
  }, [ensureAudio, videoRef]);

  const seek = useCallback(
    (time: number): void => {
      const video = videoRef.current;
      if (!video || statusRef.current !== 'ready') return;
      video.currentTime = time;
      setCurrentTime(time);
    },
    [videoRef],
  );

  const stepSpeedBy = useCallback((dir: 1 | -1): void => {
    setSpeedState((current) => stepSpeed(current, dir));
  }, []);

  const setVolume = useCallback((next: number): void => {
    volumeRef.current = next;
    setVolumeState(next);
    if (audioRef.current) {
      audioRef.current.gain.gain.value = gainFor(next);
    }
  }, []);

  const setLoop = useCallback(
    (next: boolean): void => {
      setLoopState(next);
      if (videoRef.current) videoRef.current.loop = next;
    },
    [videoRef],
  );

  // Speed and pitch: playbackRate with pitch preserved (FR-06, FR-08).
  // defaultPlaybackRate is also set: the media load algorithm resets playbackRate to it,
  // so a replaced video would otherwise fall back to 1.00x.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.defaultPlaybackRate = speed;
    video.playbackRate = speed;
    video.preservesPitch = true;
  }, [speed, videoRef]);

  // Stop everything and release resources when the page goes away (NFR-04).
  const dispose = useCallback((): void => {
    busyRef.current = false;
    resumeAfterLoadRef.current = false;
    videoRef.current?.pause();
    releaseSource();
    if (audioRef.current) {
      void audioRef.current.ctx.close();
      audioRef.current = null;
    }
  }, [releaseSource, videoRef]);

  useEffect(() => {
    window.addEventListener('pagehide', dispose);
    return () => {
      window.removeEventListener('pagehide', dispose);
      dispose();
    };
  }, [dispose]);

  // ---- media element event handlers (wired in the view) ----

  const onLoadedMetadata = useCallback((): void => {
    const video = videoRef.current;
    if (!video || !busyRef.current) return;
    if (video.videoWidth <= 0 || video.videoHeight <= 0) {
      failLoad(); // audio-only MP4 (OQ-30)
      return;
    }
    busyRef.current = false;
    setVideoSize({ width: video.videoWidth, height: video.videoHeight });
    setDuration(video.duration);
    setStatus('ready');
  }, [failLoad, setStatus, videoRef]);

  const onLoadedData = useCallback((): void => {
    const video = videoRef.current;
    if (!video || !resumeAfterLoadRef.current) return;
    resumeAfterLoadRef.current = false;
    ensureAudio();
    video.play().catch(() => setPlaying(false));
  }, [ensureAudio, videoRef]);

  const onError = useCallback((): void => {
    // Errors after the source was removed are expected; only real failures count.
    if (!videoRef.current?.getAttribute('src')) return;
    failLoad();
  }, [failLoad, videoRef]);

  const onPlay = useCallback(() => setPlaying(true), []);
  const onPause = useCallback(() => setPlaying(false), []);
  const onEnded = useCallback(() => setPlaying(false), []);
  const onTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }, [videoRef]);
  const onDurationChange = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  }, [videoRef]);

  return {
    status,
    playing,
    currentTime,
    duration,
    videoSize,
    speed,
    volume,
    loop,
    message,
    loadFile,
    togglePlay,
    seek,
    stepSpeedBy,
    setVolume,
    setLoop,
    gainValue: gainFor(volume),
    mediaHandlers: {
      onLoadedMetadata,
      onLoadedData,
      onError,
      onPlay,
      onPause,
      onEnded,
      onTimeUpdate,
      onDurationChange,
    },
  };
}
