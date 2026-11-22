// Selection of the file to play from a drop (FR-01, FR-22, OQ-06, OQ-31, OQ-35).

/** The part of DataTransferItem that the selection needs (easy to fake in tests). */
export interface DropItemLike {
  kind: string;
  /** True when the item is a folder (from webkitGetAsEntry). */
  isDirectory: () => boolean;
  getFile: () => File | null;
}

export interface DropPick {
  file: File;
  /** Number of dropped files (folders and non-file items excluded). */
  count: number;
}

/**
 * Returns the first dropped file and the total count, or null when the drop
 * must be ignored silently: no file items, or the first file item is a folder.
 * Text and links are not file items and are ignored (FR-01).
 */
export function selectDroppedFile(items: DropItemLike[]): DropPick | null {
  const fileItems = items.filter((item) => item.kind === 'file');
  if (fileItems.length === 0 || fileItems[0].isDirectory()) {
    return null;
  }
  const files = fileItems.filter((item) => !item.isDirectory());
  const first = files[0].getFile();
  if (!first) {
    return null;
  }
  return { file: first, count: files.length };
}
