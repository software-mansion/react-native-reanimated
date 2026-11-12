import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const SMALL_VIEWPORT = { width: 440, height: 360 };
const LARGE_VIEWPORT = { width: 1100, height: 900 };

// The exiting animation runs on a copy of the overlay, and the original is hidden
function getVisibleOverlaySize(page: Page) {
  return page.evaluate(() => {
    const overlay = Array.from(
      document.querySelectorAll<HTMLElement>('[data-testid="overlay"]')
    ).find((element) => getComputedStyle(element).visibility !== 'hidden');
    const rect = overlay?.getBoundingClientRect();
    return rect ? { width: rect.width, height: rect.height } : null;
  });
}

async function getParentSize(page: Page) {
  return page.evaluate(() => {
    const overlay = document.querySelector<HTMLElement>(
      '[data-testid="overlay"]'
    );
    const rect = (
      overlay?.offsetParent ?? document.body
    ).getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
}

test.describe('ResizedOverlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(SMALL_VIEWPORT);
    await page.goto('/Reanimated/ResizedOverlay');
    await page.getByRole('button', { name: 'Open with a preset' }).waitFor();
  });

  for (const [from, to] of [
    [SMALL_VIEWPORT, LARGE_VIEWPORT],
    [LARGE_VIEWPORT, SMALL_VIEWPORT],
  ]) {
    for (const animation of ['a preset', 'a Keyframe']) {
      test(`exits at the current size with ${animation} after a resize from ${from.width} to ${to.width}`, async ({
        page,
      }) => {
        await page.setViewportSize(from);
        await page
          .getByRole('button', { name: `Open with ${animation}` })
          .click();
        // The entering animation takes 300 ms
        await page.waitForTimeout(600);

        await page.setViewportSize(to);
        const parentSize = await getParentSize(page);
        await page.getByRole('button', { name: 'Close' }).click();
        // The exiting animation takes 1500 ms
        await page.waitForTimeout(300);

        expect(await getVisibleOverlaySize(page)).toEqual(parentSize);
      });
    }
  }

  for (const animation of ['a Keyframe', 'initial values']) {
    test(`keeps following its parent after entering with ${animation}`, async ({
      page,
    }) => {
      await page
        .getByRole('button', { name: `Open with ${animation}` })
        .click();
      // The keyframes of a custom entering animation are cleaned up after 5 times its duration
      await page.waitForTimeout(2000);

      await page.setViewportSize(LARGE_VIEWPORT);

      expect(await getVisibleOverlaySize(page)).toEqual(
        await getParentSize(page)
      );
    });
  }
});
