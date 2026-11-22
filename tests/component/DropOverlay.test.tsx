import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DropOverlay } from '../../src/components/DropOverlay';

describe('DropOverlay (FR-19, OQ-33)', () => {
  it('shows the drop text when visible', () => {
    render(<DropOverlay visible />);
    expect(screen.getByText('Drop to play')).toBeInTheDocument();
  });

  it('is hidden when not visible', () => {
    const { container } = render(<DropOverlay visible={false} />);
    expect(container.firstChild).toHaveAttribute('hidden');
  });
});
