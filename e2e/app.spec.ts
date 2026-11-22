// Issue #11 (UR-11) plus the app-wide checks in #10 and NFR-03 / NFR-04 / NFR-08.
import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { FIXTURES } from './helpers';
import { dropFiles, dropText, launchApp, videoState, waitReady } from './helpers';

test('AT-12: title, default size (half of the work area), minimum 420x420', async () => {
  const { app, page } = await launchApp();
  try {
    const info = await app.evaluate(({ BrowserWindow, screen }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
      const [width, height] = win.getSize();
      return {
        title: win.getTitle(),
        width,
        height,
        minimum: win.getMinimumSize(),
        workArea: display.workArea,
      };
    });
    expect(info.title).toBe('4x-speed-mp4-player');
    expect(info.minimum).toEqual([420, 420]);
    expect(info.width).toBe(Math.max(420, Math.round(info.workArea.width / 2)));
    expect(info.height).toBe(Math.max(420, Math.round(info.workArea.height / 2)));
    await expect(page).toHaveTitle('4x-speed-mp4-player');
  } finally {
    await app.close();
  }
});

test('AT-12: a second launch does not open a second window (single instance)', async () => {
  const { app, page } = await launchApp();
  try {
    // A second launch must exit by itself (the lock is held by the first instance).
    const electronBin = path.resolve('node_modules/electron/dist/electron');
    const exitCode = await new Promise<number | null>((resolve) => {
      const child = spawn(electronBin, ['.'], { cwd: path.resolve('.'), stdio: 'ignore' });
      const timer = setTimeout(() => {
        child.kill();
        resolve(null);
      }, 20_000);
      child.once('exit', (code) => {
        clearTimeout(timer);
        resolve(code);
      });
    });
    expect(exitCode).toBe(0);
    const windows = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
    expect(windows).toBe(1);
    await expect(page.locator('[data-testid="app"]')).toBeVisible();
  } finally {
    await app.close();
  }
});

test('AT-21: dropping a file or a link does not move or navigate the window', async () => {
  const { app, page } = await launchApp();
  try {
    const before = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getPosition());
    const url = page.url();
    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    await dropText(page, 'https://example.com/');
    expect(page.url()).toBe(url);
    const after = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getPosition());
    expect(after).toEqual(before);
  } finally {
    await app.close();
  }
});

test('AT-22: at 420x420 nothing scrolls horizontally and every control is reachable', async () => {
  const { app, page } = await launchApp();
  try {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(420, 420));
    await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(420);
    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    for (const name of ['Play', 'Slower', 'Faster', 'Loop', 'Choose file']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await expect(page.locator('#volume')).toBeVisible();
  } finally {
    await app.close();
  }
});

test('AT-23 / NFR-03: playing a video sends nothing to the network', async () => {
  const { app, page } = await launchApp();
  try {
    const external: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (!/^(file|blob|data):/.test(url) && !url.startsWith('devtools:')) external.push(url);
    });
    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    await page.getByRole('button', { name: 'Play' }).click();
    await page.waitForTimeout(1000);
    expect(external).toEqual([]);
  } finally {
    await app.close();
  }
});

test('AT-24 / NFR-04: ten replacements grow the JS heap by at most 50 MB', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    const heap = () => page.evaluate(() => {
      const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
      return perf.memory?.usedJSHeapSize ?? -1;
    });
    const first = await heap();
    test.skip(first < 0, 'performance.memory is not available in this Electron build');
    for (let i = 0; i < 10; i++) {
      await dropFiles(page, [{ name: i % 2 ? 'sample.mp4' : 'portrait.mp4' }]);
      await waitReady(page);
    }
    const last = await heap();
    expect(last - first).toBeLessThanOrEqual(50 * 1024 * 1024);
  } finally {
    await app.close();
  }
});

test('NFR-08: the page has no Node.js access and the window is sandboxed', async () => {
  const { app, page } = await launchApp();
  try {
    const globals = await page.evaluate(() => ({
      require: typeof (globalThis as Record<string, unknown>).require,
      process: typeof (globalThis as Record<string, unknown>).process,
      module: typeof (globalThis as Record<string, unknown>).module,
    }));
    expect(globals).toEqual({ require: 'undefined', process: 'undefined', module: 'undefined' });
    const prefs = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.webContents.getLastWebPreferences?.() ?? null;
    });
    expect(prefs).not.toBeNull();
    expect(prefs!.sandbox).toBe(true);
    expect(prefs!.nodeIntegration).toBe(false);
    expect(prefs!.contextIsolation).toBe(true);
  } finally {
    await app.close();
  }
});

test('AT-10 (state guard): a drop during loading is ignored without a message', async () => {
  const { app, page } = await launchApp();
  try {
    // Two drops in one task: the second arrives while the first is still being read.
    await page.evaluate(() => {
      const make = (name: string, bytes: number[]) => {
        const dt = new DataTransfer();
        dt.items.add(new File([Uint8Array.from(bytes)], name, { type: 'video/mp4' }));
        return dt;
      };
      const drop = (dt: DataTransfer) => window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      const fetchBytes = async (file: string) => Array.from(new Uint8Array(await (await fetch(file)).arrayBuffer()));
      void fetchBytes;
      (window as unknown as { __make: typeof make; __drop: typeof drop }).__make = make;
      (window as unknown as { __make: typeof make; __drop: typeof drop }).__drop = drop;
    });
    const sample = fs.readFileSync(path.join(FIXTURES, 'sample.mp4'));
    const portrait = fs.readFileSync(path.join(FIXTURES, 'portrait.mp4'));
    await page.evaluate(
      ({ a, b }) => {
        const w = window as unknown as {
          __make: (name: string, bytes: number[]) => DataTransfer;
          __drop: (dt: DataTransfer) => void;
        };
        w.__drop(w.__make('sample.mp4', a));
        w.__drop(w.__make('portrait.mp4', b));
      },
      { a: Array.from(sample), b: Array.from(portrait) },
    );
    await waitReady(page);
    const state = await videoState(page);
    expect(state.videoHeight).toBe(360); // sample.mp4 (640x360) won; portrait.mp4 was ignored
    await expect(page.getByRole('status')).toHaveText('');
  } finally {
    await app.close();
  }
});
