// All user-visible text. English only (NFR-10, OQ-09, OQ-23).

export const MESSAGES = {
  appTitle: '4x-speed-mp4-player',
  dropHint: 'Drop an MP4 file here',
  dropOverlay: 'Drop to play',
  loading: 'Loading…',
  notLowercaseMp4: 'Only lowercase .mp4 files can be played.',
  unplayable: 'Unplayable data',
  firstOfMany: (count: number): string => `Only the first of ${count} files is played.`,
  play: 'Play',
  pause: 'Pause',
  slower: 'Slower',
  faster: 'Faster',
  volume: 'Volume',
  loop: 'Loop',
  chooseFile: 'Choose file',
  seek: 'Seek',
  resizeHandle: 'Resize video',
} as const;
