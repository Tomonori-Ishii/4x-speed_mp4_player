// Issues #1 (UR-01), #2 (UR-02), #3 (UR-03), #9 (UR-09), #14 (UR-14), #15 (UR-15), #16 (UR-16)
import { expect, test } from '@playwright/test';
import { dropFiles, dropText, launchApp, setRange, videoState, waitReady } from './helpers';

test.describe.configure({ mode: 'serial' });

test('AT-01: a lowercase .mp4 dropped anywhere plays; .mov and .MP4 are rejected', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    const first = await videoState(page);
    expect(first.videoWidth).toBe(640);

    await page.getByRole('button', { name: 'Play' }).click();
    await expect.poll(async () => (await videoState(page)).currentTime).toBeGreaterThan(0.2);

    // Rejected files: message shown, playing video unchanged.
    await dropFiles(page, [{ name: 'clip.mov', file: 'sample.mp4' }]);
    await expect(page.getByRole('status')).toHaveText('Only lowercase .mp4 files can be played.');
    await dropFiles(page, [{ name: 'CLIP.MP4', file: 'sample.mp4' }]);
    await expect(page.getByRole('status')).toHaveText('Only lowercase .mp4 files can be played.');
    const after = await videoState(page);
    expect(after.src).toBe(first.src);
    expect(after.status).toBe('ready');
  } finally {
    await app.close();
  }
});

test('AT-02 / AT-03: play and pause toggle; without loop the video pauses at the end and Play restarts it', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();

    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();

    // Play to the end (about 3 s); loop is off by default.
    await page.getByRole('button', { name: 'Play' }).click();
    await expect.poll(async () => (await videoState(page)).ended, { timeout: 15_000 }).toBe(true);
    const end = await videoState(page);
    expect(end.paused).toBe(true);
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();

    await page.getByRole('button', { name: 'Play' }).click();
    await expect.poll(async () => (await videoState(page)).paused).toBe(false);
    expect((await videoState(page)).currentTime).toBeLessThan(1);
  } finally {
    await app.close();
  }
});

test('AT-04: seeking moves the position and the time reads "current / total"', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'long.mp4' }]);
    await waitReady(page);
    await expect(page.locator('.time')).toHaveText('0:00 / 0:08');
    await setRange(page, 'input[aria-label="Seek"]', 5);
    await expect.poll(async () => (await videoState(page)).currentTime).toBeGreaterThan(4.9);
    await expect(page.locator('.time')).toHaveText('0:05 / 0:08');
  } finally {
    await app.close();
  }
});

test('AT-15: "Choose file" accepts one .mp4 through the picker', async () => {
  const { app, page } = await launchApp();
  try {
    const input = page.getByTestId('file-input');
    await expect(input).toHaveAttribute('accept', '.mp4');
    await expect(input).not.toHaveAttribute('multiple', '');
    await input.setInputFiles('e2e/fixtures/sample.mp4');
    await waitReady(page);
    expect((await videoState(page)).videoWidth).toBe(640);
  } finally {
    await app.close();
  }
});

test('AT-17 / AT-38: several files play the first; a rejected first file stops the load', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'sample.mp4' }, { name: 'portrait.mp4' }]);
    await expect(page.getByRole('status')).toHaveText('Only the first of 2 files is played.');
    await waitReady(page);
    expect((await videoState(page)).videoWidth).toBe(640);

    await dropFiles(page, [{ name: 'clip.mov', file: 'sample.mp4' }, { name: 'portrait.mp4' }]);
    await expect(page.getByRole('status')).toHaveText('Only lowercase .mp4 files can be played.');
    expect((await videoState(page)).videoWidth).toBe(640);
  } finally {
    await app.close();
  }
});

test('AT-17 (unplayable first file): the notice is replaced by "Unplayable data"', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'broken.mp4' }, { name: 'sample.mp4' }]);
    await expect(page.getByRole('status')).toHaveText('Unplayable data');
    await expect(page.locator('[data-testid="app"]')).toHaveAttribute('data-status', 'failed');
  } finally {
    await app.close();
  }
});

test('AT-32: text and non-file drops do nothing and do not change the video', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    const before = await videoState(page);
    await dropText(page, 'https://example.com/video.mp4');
    await expect(page.getByRole('status')).toHaveText('');
    await expect(page.locator('.drop-overlay')).toBeHidden();
    expect((await videoState(page)).src).toBe(before.src);
  } finally {
    await app.close();
  }
});

test('AT-16: the drop overlay shows while a file is dragged and hides after the drop', async () => {
  const { app, page } = await launchApp();
  try {
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(['x'], 'a.mp4', { type: 'video/mp4' }));
      window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
    });
    await expect(page.locator('.drop-overlay')).toBeVisible();
    await expect(page.locator('.drop-overlay')).toHaveText('Drop to play');
    await page.evaluate(() => {
      window.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() }));
    });
    await expect(page.locator('.drop-overlay')).toBeHidden();
  } finally {
    await app.close();
  }
});

test('AT-09 / AT-36: a broken file and an audio-only MP4 show "Unplayable data" and empty the video area', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'broken.mp4' }]);
    await expect(page.getByRole('status')).toHaveText('Unplayable data');
    await expect(page.locator('.stage')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Play' })).toBeDisabled();

    await dropFiles(page, [{ name: 'audio-only.mp4' }]);
    await expect(page.getByRole('status')).toHaveText('Unplayable data');
    await expect(page.locator('.stage')).toBeHidden();
  } finally {
    await app.close();
  }
});

test('AT-10 / AT-31: replacing keeps settings and playing state; a paused replacement stays paused', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    // Start paused on the first frame (AT-31).
    expect((await videoState(page)).paused).toBe(true);

    await page.getByRole('button', { name: 'Faster' }).click();
    await page.getByRole('button', { name: 'Faster' }).click();
    await page.getByRole('button', { name: 'Loop' }).click();
    await page.getByRole('button', { name: 'Play' }).click();
    await expect.poll(async () => (await videoState(page)).currentTime).toBeGreaterThan(0.3);

    // Replace while playing: playback continues from the start with the same settings.
    await dropFiles(page, [{ name: 'portrait.mp4' }]);
    await waitReady(page);
    await expect.poll(async () => (await videoState(page)).paused).toBe(false);
    const playing = await videoState(page);
    expect(playing.videoHeight).toBe(640);
    expect(playing.currentTime).toBeLessThan(1);
    expect(playing.playbackRate).toBe(1.5);
    expect(playing.loop).toBe(true);
    await expect(page.getByText('1.50x')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Loop' })).toHaveAttribute('aria-pressed', 'true');

    // Pause, then replace: it stays paused.
    await page.getByRole('button', { name: 'Pause' }).click();
    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    await expect.poll(async () => (await videoState(page)).paused).toBe(true);

    // A rejected file keeps the current video.
    const kept = await videoState(page);
    await dropFiles(page, [{ name: 'clip.mov', file: 'sample.mp4' }]);
    await expect(page.getByRole('status')).toHaveText('Only lowercase .mp4 files can be played.');
    expect((await videoState(page)).src).toBe(kept.src);
  } finally {
    await app.close();
  }
});

test('AT-18: clicking the video toggles play; clicking the resize handle does not', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    const video = page.locator('video');
    await video.click();
    await expect.poll(async () => (await videoState(page)).paused).toBe(false);
    await video.click();
    await expect.poll(async () => (await videoState(page)).paused).toBe(true);

    const handle = page.getByRole('slider', { name: 'Resize video' });
    const before = (await videoState(page)).paused;
    await handle.click();
    expect((await videoState(page)).paused).toBe(before);
  } finally {
    await app.close();
  }
});

test('AT-14: a message stays until replaced, it does not clear by itself', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'clip.mov', file: 'sample.mp4' }]);
    await expect(page.getByRole('status')).toHaveText('Only lowercase .mp4 files can be played.');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('status')).toHaveText('Only lowercase .mp4 files can be played.');
  } finally {
    await app.close();
  }
});
