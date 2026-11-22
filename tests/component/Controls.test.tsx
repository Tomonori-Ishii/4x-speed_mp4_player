import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Controls, type ControlsProps } from '../../src/components/Controls';

const noop = () => {};
const base: ControlsProps = {
  status: 'initial',
  playing: false,
  currentTime: 0,
  duration: Number.NaN,
  speed: 1,
  volume: 0,
  loop: false,
  onTogglePlay: noop,
  onSeek: noop,
  onSlower: noop,
  onFaster: noop,
  onVolumeChange: noop,
  onToggleLoop: noop,
  onChooseFile: noop,
};

describe('Controls', () => {
  it('disables playback controls before a video is loaded (FR-16, AT-13)', () => {
    render(<Controls {...base} />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Slower' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Faster' })).toBeDisabled();
    expect(screen.getByLabelText('Seek')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Loop' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeEnabled();
  });

  it('shows 0:00 / 0:00 and the speed and volume values without a video (AT-04, AT-11)', () => {
    render(<Controls {...base} speed={2.5} volume={40} />);
    expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument();
    expect(screen.getByText('2.50x')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('switches the play button label between Play and Pause (AT-02)', () => {
    const { rerender } = render(<Controls {...base} status="ready" playing={false} duration={8} />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled();
    rerender(<Controls {...base} status="ready" playing duration={8} />);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('shows the unknown total as --:-- and disables seek (OQ-34)', () => {
    render(<Controls {...base} status="ready" currentTime={3} duration={Number.NaN} />);
    expect(screen.getByText('0:03 / --:--')).toBeInTheDocument();
    expect(screen.getByLabelText('Seek')).toBeDisabled();
  });

  it('disables Slower at 1.00x and Faster at 4.00x (AT-05)', () => {
    const { rerender } = render(<Controls {...base} status="ready" speed={1} />);
    expect(screen.getByRole('button', { name: 'Slower' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Faster' })).toBeEnabled();
    rerender(<Controls {...base} status="ready" speed={4} />);
    expect(screen.getByRole('button', { name: 'Faster' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Slower' })).toBeEnabled();
  });

  it('exposes the loop state with aria-pressed (AT-25)', () => {
    const { rerender } = render(<Controls {...base} loop={false} />);
    expect(screen.getByRole('button', { name: 'Loop' })).toHaveAttribute('aria-pressed', 'false');
    rerender(<Controls {...base} loop />);
    expect(screen.getByRole('button', { name: 'Loop' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables Choose file while loading (FR-18)', () => {
    render(<Controls {...base} status="loading" />);
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeDisabled();
  });

  it('calls the handler when Faster is clicked', () => {
    const onFaster = vi.fn();
    render(<Controls {...base} status="ready" onFaster={onFaster} />);
    fireEvent.click(screen.getByRole('button', { name: 'Faster' }));
    expect(onFaster).toHaveBeenCalledTimes(1);
  });
});
