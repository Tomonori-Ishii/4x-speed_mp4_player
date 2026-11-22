import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MessageBar } from '../../src/components/MessageBar';

describe('MessageBar (FR-17, NFR-06, AT-14)', () => {
  it('is a polite live region', () => {
    render(<MessageBar message={null} />);
    const bar = screen.getByRole('status');
    expect(bar).toHaveAttribute('aria-live', 'polite');
  });

  it('shows the message and the full text as a tooltip', () => {
    const long = 'Only the first of 12 files is played.';
    render(<MessageBar message={long} />);
    const bar = screen.getByRole('status');
    expect(bar).toHaveTextContent(long);
    expect(bar).toHaveAttribute('title', long);
  });

  it('has no tooltip when there is no message', () => {
    render(<MessageBar message={null} />);
    expect(screen.getByRole('status')).not.toHaveAttribute('title');
  });
});
