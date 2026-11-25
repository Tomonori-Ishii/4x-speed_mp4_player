// Spike (feature/subtitle-spike): subtitles from the MP4 tx3g track, drawn by the app.
// Fixture: e2e/fixtures/subtitled.mp4 (gitignored). Cue times come from its SRT (ffmpeg).
import { test, expect } from '@playwright/test';
import { launchApp, dropFiles, waitReady } from './helpers';

async function seekTo(page: import('@playwright/test').Page, time: number): Promise<void> {
  await page.evaluate((t) => {
    const v = document.querySelector('video') as HTMLVideoElement;
    v.currentTime = t;
  }, time);
  await page.waitForFunction((t) => Math.abs((document.querySelector('video') as HTMLVideoElement).currentTime - t) < 0.2, time);
}

test('subtitles show at the right time, and the toggle hides them', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'subtitled.mp4' }]);
    await waitReady(page);

    // Subtitles are read after the video is ready; wait for the toggle (shown only when cues exist).
    const toggle = page.locator('.subtitle-toggle');
    await expect(toggle).toHaveText('Subtitles: On', { timeout: 20_000 });

    await seekTo(page, 1.0);
    await expect(page.getByTestId('subtitle')).toContainText('際に相手に大きな影響', { timeout: 5_000 });

    await seekTo(page, 10.0);
    await expect(page.getByTestId('subtitle')).toContainText('半分が見た目', { timeout: 5_000 });

    await toggle.click();
    await expect(toggle).toHaveText('Subtitles: Off');
    await expect(page.getByTestId('subtitle')).toHaveCount(0);

    await toggle.click();
    await expect(page.getByTestId('subtitle')).toContainText('半分が見た目');
  } finally {
    await app.close();
  }
});
