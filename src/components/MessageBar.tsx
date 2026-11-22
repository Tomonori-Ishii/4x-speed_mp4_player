export interface MessageBarProps {
  message: string | null;
}

/**
 * One line for errors and notices (FR-17). Overflow is cut with an ellipsis
 * by CSS and the full text is shown as a tooltip. Announced politely (NFR-06).
 */
export function MessageBar({ message }: MessageBarProps) {
  return (
    <div className="message-bar" role="status" aria-live="polite" title={message ?? undefined}>
      {message ?? ''}
    </div>
  );
}
