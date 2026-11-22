import { describe, expect, it } from 'vitest';
import { selectDroppedFile, type DropItemLike } from '../../src/lib/dropItems';

const fileItem = (name: string, directory = false): DropItemLike => ({
  kind: 'file',
  isDirectory: () => directory,
  getFile: () => new File(['x'], name, { type: 'video/mp4' }),
});
const stringItem: DropItemLike = { kind: 'string', isDirectory: () => false, getFile: () => null };

describe('selectDroppedFile (FR-01, FR-22, OQ-06, OQ-31)', () => {
  it('returns the first file and count 1 for a single file', () => {
    const pick = selectDroppedFile([fileItem('a.mp4')]);
    expect(pick?.file.name).toBe('a.mp4');
    expect(pick?.count).toBe(1);
  });

  it('uses the first file and the total count for several files (AT-17)', () => {
    const pick = selectDroppedFile([fileItem('first.mp4'), fileItem('second.mp4'), fileItem('third.mp4')]);
    expect(pick?.file.name).toBe('first.mp4');
    expect(pick?.count).toBe(3);
  });

  it('ignores text and link items (AT-32)', () => {
    expect(selectDroppedFile([stringItem])).toBeNull();
    expect(selectDroppedFile([])).toBeNull();
  });

  it('ignores a drop whose first file item is a folder (AT-32)', () => {
    expect(selectDroppedFile([fileItem('dir', true), fileItem('a.mp4')])).toBeNull();
  });

  it('skips folders that come after a file when counting', () => {
    const pick = selectDroppedFile([fileItem('a.mp4'), fileItem('dir', true), fileItem('b.mp4')]);
    expect(pick?.file.name).toBe('a.mp4');
    expect(pick?.count).toBe(2);
  });
});
