import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const FIXTURES = path.resolve('e2e/fixtures');

/** Launches the built app (dist-electron/main.js + dist/) and returns its first window. */
export async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({ args: ['.'] });
  const page = await app.firstWindow();
  await page.waitForSelector('[data-testid="app"]');
  return { app, page };
}

/**
 * Simulates dropping fixture files onto the window. Uses real File objects inside a
 * DataTransfer, dispatched as dragenter + drop on window (the same path as a real drop).
 */
export async function dropFiles(page: Page, files: Array<{ name: string; file?: string }>): Promise<void> {
  const payload = files.map((f) => ({
    name: f.name,
    base64: fs.readFileSync(path.join(FIXTURES, f.file ?? f.name)).toString('base64'),
  }));
  await page.evaluate((list) => {
    const dt = new DataTransfer();
    for (const f of list) {
      const bytes = Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0));
      dt.items.add(new File([bytes], f.name, { type: 'video/mp4' }));
    }
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, payload);
}

/** Dispatches a drag of arbitrary (non-file) data, e.g. a text string. */
export async function dropText(page: Page, text: string): Promise<void> {
  await page.evaluate((t) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', t);
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, text);
}

export interface VideoState {
  status: string;
  paused: boolean;
  ended: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  preservesPitch: boolean;
  loop: boolean;
  videoWidth: number;
  videoHeight: number;
  src: string | null;
  gain: string | null;
}

export async function videoState(page: Page): Promise<VideoState> {
  return page.evaluate(() => {
    const v = document.querySelector('video') as HTMLVideoElement;
    const app = document.querySelector('[data-testid="app"]') as HTMLElement;
    return {
      status: app.dataset.status ?? '',
      paused: v.paused,
      ended: v.ended,
      currentTime: v.currentTime,
      duration: v.duration,
      playbackRate: v.playbackRate,
      preservesPitch: v.preservesPitch,
      loop: v.loop,
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight,
      src: v.getAttribute('src'),
      gain: app.dataset.gain ?? null,
    };
  });
}

/** Waits until a video is loaded and controls are live. */
export async function waitReady(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="app"][data-status="ready"]', { timeout: 15_000 });
}

/** Sets a range input (seek / volume) and fires the input event React listens to. */
export async function setRange(page: Page, selector: string, value: number): Promise<void> {
  await page.locator(selector).evaluate((el, v) => {
    const input = el as HTMLInputElement;
    // Use the native setter so React's value tracking notices the change.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, String(v));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
