// Issues #4 (UR-04), #5 (UR-05), #6 (UR-06), #7 (UR-07), #8 (UR-08), #12 (UR-12), #13 (UR-13)
import { expect, test } from '@playwright/test';
import { dropFiles, launchApp, setRange, videoState, waitReady } from './helpers';

test('AT-13 / AT-34: at launch the controls are unavailable and the hint is shown', async () => {
  const { app, page } = await launchApp();
  try {
    await expect(page.locator('.hint')).toHaveText('Drop an MP4 file here');
    for (const name of ['Play', 'Slower', 'Faster']) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeDisabled();
      const opacity = await button.evaluate((el) => Number(getComputedStyle(el).opacity));
      expect(opacity).toBeLessThan(1);
    }
    await expect(page.getByLabel('Seek')).toBeDisabled();
    await expect(page.locator('.volume')).toBeDisabled();
    await expect(page.getByRole('slider', { name: 'Resize video' })).toHaveAttribute('aria-disabled', 'true');
    // Loop is always available (OQ-15).
    await expect(page.getByRole('button', { name: 'Loop' })).toBeEnabled();
    // The value of the volume is still shown (AT-11).
    await expect(page.locator('.volume-value')).toHaveText('0%');
    await expect(page.locator('.speed')).toHaveText('1.00x');

    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    await expect(page.getByRole('button', { name: 'Play' })).toBeEnabled();
    const opacity = await page.getByRole('button', { name: 'Play' }).evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(opacity).toBe(1);
  } finally {
    await app.close();
  }
});

test('AT-05 (speed): Faster and Slower step by 0.25 and disable at 1.00x and 4.00x', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    await expect(page.getByRole('button', { name: 'Slower' })).toBeDisabled();
    await page.getByRole('button', { name: 'Faster' }).click();
    await expect(page.locator('.speed')).toHaveText('1.25x');
    await expect(page.getByRole('button', { name: 'Slower' })).toBeEnabled();
    for (let i = 0; i < 11; i++) await page.getByRole('button', { name: 'Faster' }).click();
    await expect(page.locator('.speed')).toHaveText('4.00x');
    await expect(page.getByRole('button', { name: 'Faster' })).toBeDisabled();
    await expect.poll(async () => (await videoState(page)).playbackRate).toBe(4);
    // AT-06 (automatable part): the pitch is preserved at every speed.
    expect((await videoState(page)).preservesPitch).toBe(true);
    await page.getByRole('button', { name: 'Slower' }).click();
    await expect(page.locator('.speed')).toHaveText('3.75x');
  } finally {
    await app.close();
  }
});

test('AT-11 / AT-33 (volume display and gain): 0% at launch, 125% gives gain 1.25', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    await expect(page.locator('.volume-value')).toHaveText('0%');
    await expect(page.locator('[data-testid="app"]')).toHaveAttribute('data-gain', '0');
    await setRange(page, '#volume', 125);
    await expect(page.locator('.volume-value')).toHaveText('125%');
    await expect(page.locator('[data-testid="app"]')).toHaveAttribute('data-gain', '1.25');
    await setRange(page, '#volume', 100);
    await expect(page.locator('[data-testid="app"]')).toHaveAttribute('data-gain', '1');
  } finally {
    await app.close();
  }
});

test('AT-30: a silent MP4 keeps the volume slider usable and shows no message', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'silent.mp4' }]);
    await waitReady(page);
    await expect(page.locator('.volume')).toBeEnabled();
    await setRange(page, '#volume', 50);
    await expect(page.locator('.volume-value')).toHaveText('50%');
    await expect(page.getByRole('status')).toHaveText('');
  } finally {
    await app.close();
  }
});

test('AT-07 / AT-08 / AT-35: the resize handle keeps the ratio, respects 160px and the display width', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    const stage = page.locator('.stage');
    const handle = page.getByRole('slider', { name: 'Resize video' });
    const before = await stage.boundingBox();
    expect(before).not.toBeNull();

    const hb = await handle.boundingBox();
    if (!hb) throw new Error('handle not visible');
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2 - 150, hb.y + hb.height / 2, { steps: 5 });
    await page.mouse.up();
    const smaller = await stage.boundingBox();
    expect(smaller!.width).toBeLessThan(before!.width);
    expect(smaller!.width / smaller!.height).toBeCloseTo(16 / 9, 1);

    // Minimum 160 px (AT-35).
    const hb2 = await handle.boundingBox();
    if (!hb2) throw new Error('handle not visible');
    await page.mouse.move(hb2.x + hb2.width / 2, hb2.y + hb2.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb2.x - 2000, hb2.y, { steps: 5 });
    await page.mouse.up();
    const minimum = await stage.boundingBox();
    expect(minimum!.width).toBeCloseTo(160, 0);

    // Maximum: the display width (AT-35).
    const screenWidth = await page.evaluate(() => window.screen.width);
    const hb3 = await handle.boundingBox();
    if (!hb3) throw new Error('handle not visible');
    await page.mouse.move(hb3.x + hb3.width / 2, hb3.y + hb3.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb3.x + 5000, hb3.y, { steps: 5 });
    await page.mouse.up();
    const maximum = await stage.boundingBox();
    expect(maximum!.width).toBeLessThanOrEqual(screenWidth + 1);
  } finally {
    await app.close();
  }
});

test('AT-07 (layout): a 1920x1080 video in a 960x540 window does not overlap the controls or the message line', async ({}, testInfo) => {
  const { app, page } = await launchApp();
  try {
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setSize(960, 540);
    });
    await dropFiles(page, [{ name: 'fhd.mp4' }]);
    await waitReady(page);
    const stage = await page.locator('.stage').boundingBox();
    const message = await page.locator('.message-bar').boundingBox();
    const controls = await page.locator('.controls').boundingBox();
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(stage && message && controls).toBeTruthy();
    expect(stage!.y).toBeGreaterThanOrEqual(message!.y + message!.height - 0.5);
    expect(stage!.y + stage!.height).toBeLessThanOrEqual(viewportHeight + 0.5);
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(message!.y + 0.5);
    testInfo.annotations.push({ type: 'stage', description: JSON.stringify(stage) });
  } finally {
    await app.close();
  }
});

test('AT-25 (loop): the Loop button reports its pressed state; loop on repeats the video', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'sample.mp4' }]);
    await waitReady(page);
    const loop = page.getByRole('button', { name: 'Loop' });
    await expect(loop).toHaveAttribute('aria-pressed', 'false');
    await loop.click();
    await expect(loop).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Play' }).click();
    // The clip is 3 s long; after 4.5 s it must still be playing (not paused at the end).
    await page.waitForTimeout(4500);
    const state = await videoState(page);
    expect(state.loop).toBe(true);
    expect(state.paused).toBe(false);
    expect(state.ended).toBe(false);
  } finally {
    await app.close();
  }
});

test('AT-28 / AT-12 (English only): visible text, titles and labels contain no Japanese', async () => {
  const { app, page } = await launchApp();
  try {
    await dropFiles(page, [{ name: 'clip.mov', file: 'sample.mp4' }]);
    await expect(page.getByRole('status')).toHaveText('Only lowercase .mp4 files can be played.');
    const texts = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const attrs = all.flatMap((el) => [el.getAttribute('title'), el.getAttribute('aria-label')]);
      return [document.body.innerText, ...attrs.filter((x): x is string => !!x)];
    });
    const japanese = /[぀-ヿ㐀-鿿＀-￯]/;
    for (const text of texts) {
      expect(text).not.toMatch(japanese);
    }
  } finally {
    await app.close();
  }
});
