import { MESSAGES } from '../lib/messages';

export interface DropOverlayProps {
  visible: boolean;
}

/** Shown while a file is dragged over the window (FR-19, OQ-33). */
export function DropOverlay({ visible }: DropOverlayProps) {
  return (
    <div className="drop-overlay" hidden={!visible} aria-hidden="true">
      <span>{MESSAGES.dropOverlay}</span>
    </div>
  );
}
