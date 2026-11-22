// Runs against a packaged build (AT-19, AT-29). Set PACKAGED_APP to the executable, e.g.
// release/linux-x64-unpacked/4x-speed-mp4-player. Skipped when the variable is not set.
import { _electron as electron, expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { dropFiles, videoState, waitReady } from './helpers';

const packaged = process.env.PACKAGED_APP;

test.skip(!packaged, 'PACKAGED_APP is not set');

test('AT-19: the packaged app starts and plays an H.264/AAC MP4', async () => {
  const exe = path.resolve(packaged as string);
  const app = await electron.launch({ executablePath: exe, args: [] });
  try {
    const page = await app.firstWindow();
    await page.waitForSelector('[data-testid="app"]');
    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    await page.getByRole('button', { name: 'Play' }).click();
    await expect.poll(async () => (await videoState(page)).currentTime).toBeGreaterThan(0.2);
  } finally {
    await app.close();
  }
});

test('AT-29: the distribution contains the install notes', () => {
  const resources = path.join(path.dirname(path.resolve(packaged as string)), 'resources');
  expect(fs.existsSync(path.join(resources, 'INSTALL.txt'))).toBe(true);
});
