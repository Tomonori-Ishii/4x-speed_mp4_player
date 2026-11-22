// File acceptance rules (FR-02, OQ-16).

/**
 * Only a lowercase `.mp4` extension is accepted. A name that is just `.mp4`
 * (empty part before the extension) is rejected as well (OQ-16).
 */
export function isPlayableFileName(name: string): boolean {
  return /^.+\.mp4$/.test(name);
}
