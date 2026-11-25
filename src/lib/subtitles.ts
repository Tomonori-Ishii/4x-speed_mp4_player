// Spike (feature/subtitle-spike): read the MP4 timed-text track (tx3g / mov_text)
// with mp4box.js and turn it into cues for an overlay drawn by the app.

import { createFile, type ISOFile, type Movie, type Sample } from 'mp4box';

export interface SubtitleCue {
  /** Seconds from the start of the video. */
  start: number;
  /** Seconds from the start of the video (exclusive). */
  end: number;
  /** Plain text; line breaks are kept as '\n'. */
  text: string;
}

/** Decodes one tx3g sample: a 16-bit big-endian byte length, then UTF-8 text. Styling boxes are ignored. */
export function decodeTx3gSample(bytes: Uint8Array): string {
  if (bytes.byteLength < 2) return '';
  const length = (bytes[0] << 8) | bytes[1];
  const end = Math.min(bytes.byteLength, 2 + length);
  return new TextDecoder('utf-8').decode(bytes.subarray(2, end));
}

/**
 * Cleans raw cues for display:
 * - trims whitespace and drops empty cues;
 * - merges consecutive cues with the same text (auto captions repeat the line
 *   while it rolls, so the same text appears in several adjacent samples).
 * The input must be sorted by start time, which mp4box returns for one track.
 */
export function normalizeCues(raw: SubtitleCue[]): SubtitleCue[] {
  const out: SubtitleCue[] = [];
  for (const cue of raw) {
    const text = cue.text.trim();
    if (text === '' || cue.end <= cue.start) continue;
    const last = out[out.length - 1];
    if (last && last.text === text && cue.start <= last.end) {
      last.end = Math.max(last.end, cue.end);
    } else {
      out.push({ start: cue.start, end: cue.end, text });
    }
  }
  return out;
}

/** Returns the cue shown at time `t` (seconds), or null. Binary search over sorted, non-overlapping cues. */
export function cueAt(cues: readonly SubtitleCue[], t: number): SubtitleCue | null {
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cue = cues[mid];
    if (t < cue.start) {
      hi = mid - 1;
    } else if (t >= cue.end) {
      lo = mid + 1;
    } else {
      return cue;
    }
  }
  return null;
}

function findTextTrack(info: Movie): { id: number; timescale: number; count: number } | null {
  const track = info.tracks.find((t) => t.codec.startsWith('tx3g') || t.codec.startsWith('mp4s'));
  return track ? { id: track.id, timescale: track.timescale, count: track.nb_samples } : null;
}

/**
 * Reads every sample of the first tx3g track in the file. Resolves with [] when
 * the file has no such track. Rejects when mp4box cannot parse the data.
 */
export function readTx3gCues(data: ArrayBuffer): Promise<SubtitleCue[]> {
  return new Promise<SubtitleCue[]>((resolve, reject) => {
    const file: ISOFile = createFile();
    const cues: SubtitleCue[] = [];
    let expected = -1;

    file.onError = (_module, message) => reject(new Error(message));
    file.onReady = (info) => {
      const track = findTextTrack(info);
      if (!track) {
        resolve([]);
        return;
      }
      expected = track.count;
      file.onSamples = (_id: number, _user: unknown, samples: Sample[]) => {
        for (const s of samples) {
          cues.push({
            start: s.cts / s.timescale,
            end: (s.cts + s.duration) / s.timescale,
            text: s.data ? decodeTx3gSample(new Uint8Array(s.data)) : '',
          });
        }
        if (cues.length >= expected) resolve(cues);
      };
      file.setExtractionOptions(track.id, null, { nbSamples: track.count });
      file.start();
    };

    const buffer = data as ArrayBuffer & { fileStart: number };
    buffer.fileStart = 0;
    file.appendBuffer(buffer);
    file.flush();
  });
}
