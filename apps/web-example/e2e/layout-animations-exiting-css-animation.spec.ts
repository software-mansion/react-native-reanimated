import { expect, type Locator, type Page, test } from '@playwright/test';

// The bar's CSS animation repeats every 2 s after a 500 ms delay
const TIME_PAST_DELAY_MS = 1500;
// The track's exiting animation lasts 1 s and the fade-in 300 ms
const MID_EXIT_MS = 500;

const getAnimationTime = (bar: Locator) =>
  bar.evaluate((element) => Number(element.getAnimations()[0]?.currentTime));

const getOpacity = (locator: Locator) =>
  locator.evaluate((element) => Number(getComputedStyle(element).opacity));

const hide = async (page: Page) => {
  await page.getByRole('button', { name: 'Hide' }).click();
  // The label changes in the same render that starts the exiting animation
  await expect(page.getByRole('button', { name: 'Show' })).toBeVisible();
};

test.describe('ExitingWithCSSAnimation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/Reanimated/ExitingWithCSSAnimation');
    await page.getByTestId('bar').waitFor();
  });

  test("keeps a child's CSS animation running when the parent starts exiting", async ({
    page,
  }) => {
    const bar = page.getByTestId('bar');
    await expect(async () => {
      expect(await getAnimationTime(bar)).toBeGreaterThan(TIME_PAST_DELAY_MS);
    }).toPass();
    const timeBeforeHide = await getAnimationTime(bar);

    await hide(page);

    // The exiting animation moves the bar into a copy of the track. Its CSS
    // animation should continue from where it was instead of restarting from 0 ms.
    expect(await getAnimationTime(bar)).toBeGreaterThanOrEqual(timeBeforeHide);
  });

  test("doesn't replay a child's finished entering animation", async ({
    page,
  }) => {
    const fadeIn = page.getByTestId('fade-in');
    await expect(async () => {
      expect(await getOpacity(fadeIn)).toBe(1);
    }).toPass();

    await hide(page);

    expect(await getOpacity(fadeIn)).toBe(1);
  });

  test("doesn't end the exiting animation early when a child's animation ends", async ({
    page,
  }) => {
    await hide(page);
    await expect(page.getByTestId('bar')).toHaveCount(0);
    await page.getByRole('button', { name: 'Show' }).click();
    await page.getByTestId('bar').waitFor();

    // Hiding during the child's 300 ms fade-in makes it end during the exiting animation
    await hide(page);
    await page.waitForTimeout(MID_EXIT_MS);

    await expect(page.getByTestId('bar')).toHaveCount(1);
  });
});
