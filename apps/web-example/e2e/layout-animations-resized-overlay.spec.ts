import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const SMALL_VIEWPORT = { width: 440, height: 360 };
const LARGE_VIEWPORT = { width: 1100, height: 900 };

type Animation = 'a preset' | 'a Keyframe' | 'initial values';

// Opens the overlay and waits until its entering animation is over
async function openOverlay(page: Page, animation: Animation) {
  await page.getByRole('button', { name: `Open with ${animation}` }).click();
  await page.waitForFunction(() => {
    const overlay = document.querySelector<HTMLElement>(
      '[data-testid="overlay"]'
    );
    // The overlay is hidden until its entering animation starts
    return (
      overlay &&
      getComputedStyle(overlay).visibility !== 'hidden' &&
      overlay.getAnimations().every(({ playState }) => playState === 'finished')
    );
  });
}

// The keyframes of a custom entering animation are removed some time after the animation
async function waitForKeyframesCleanup(page: Page) {
  await page.waitForFunction(() => {
    const animationName = document.querySelector<HTMLElement>(
      '[data-testid="overlay"]'
    )?.style.animationName;
    const styleTag = document.getElementById(
      'ReanimatedCustomWebAnimationsStyle'
    ) as HTMLStyleElement | null;
    return (
      animationName?.startsWith('REA-ENTERING-') &&
      !Array.from(styleTag?.sheet?.cssRules ?? []).some(
        (rule) => (rule as CSSKeyframesRule).name === animationName
      )
    );
  });
}

// This runs in the page, so the overlay is measured in the first frames of its exiting animation.
// The exiting animation runs on a copy of the overlay, and the original is hidden.
function closeOverlayAndMeasure(page: Page) {
  return page.evaluate(async () => {
    const toBox = ({ top, left, width, height }: DOMRect) => ({
      top,
      left,
      width,
      height,
    });
    const overlay = document.querySelector<HTMLElement>(
      '[data-testid="overlay"]'
    )!;
    const parent = toBox(
      (overlay.offsetParent ?? document.body).getBoundingClientRect()
    );
    const beforeExit = toBox(overlay.getBoundingClientRect());
    const getCopy = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>('[data-testid="overlay"]')
      ).find(
        (element) =>
          element !== overlay &&
          getComputedStyle(element).visibility !== 'hidden'
      );

    Array.from(overlay.querySelectorAll<HTMLElement>('[role="button"]'))
      .find((button) => button.textContent === 'Close')
      ?.click();

    let copy = getCopy();
    for (let frame = 0; frame < 30 && !copy; frame++) {
      await new Promise(requestAnimationFrame);
      copy = getCopy();
    }
    return {
      parent,
      beforeExit,
      duringExit: copy ? toBox(copy.getBoundingClientRect()) : null,
    };
  });
}

function getOverlayAndParentSizes(page: Page) {
  return page.evaluate(() => {
    const toSize = ({ width, height }: DOMRect) => ({ width, height });
    const overlay = document.querySelector<HTMLElement>(
      '[data-testid="overlay"]'
    )!;
    return {
      overlay: toSize(overlay.getBoundingClientRect()),
      parent: toSize(
        (overlay.offsetParent ?? document.body).getBoundingClientRect()
      ),
    };
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
    for (const animation of ['a preset', 'a Keyframe'] as const) {
      test(`exits at the current size with ${animation} after a resize from ${from.width} to ${to.width}`, async ({
        page,
      }) => {
        await page.setViewportSize(from);
        await openOverlay(page, animation);

        await page.setViewportSize(to);
        const { parent, duringExit } = await closeOverlayAndMeasure(page);

        expect(duringExit).toEqual(parent);
      });
    }
  }

  for (const animation of ['a Keyframe', 'initial values'] as const) {
    test(`keeps following its parent after entering with ${animation}`, async ({
      page,
    }) => {
      await openOverlay(page, animation);
      await waitForKeyframesCleanup(page);

      await page.setViewportSize(LARGE_VIEWPORT);

      const { overlay, parent } = await getOverlayAndParentSizes(page);
      expect(overlay).toEqual(parent);
    });
  }

  test('exits in place after its own content was scrolled', async ({
    page,
  }) => {
    await openOverlay(page, 'a preset');

    // Scrolling the content of the overlay doesn't move the overlay
    await page.evaluate(() => {
      const overlay = document.querySelector<HTMLElement>(
        '[data-testid="overlay"]'
      )!;
      const tallContent = document.createElement('div');
      tallContent.style.flexShrink = '0';
      tallContent.style.height = '2000px';
      overlay.style.overflow = 'auto';
      overlay.appendChild(tallContent);
      overlay.scrollTop = 100;
    });
    const { beforeExit, duringExit } = await closeOverlayAndMeasure(page);

    expect(duringExit).toEqual(beforeExit);
  });

  test('accepts style updates after entering with a Keyframe', async ({
    page,
  }) => {
    await openOverlay(page, 'a Keyframe');
    await waitForKeyframesCleanup(page);

    const opacity = await page.evaluate(() => {
      const overlay = document.querySelector<HTMLElement>(
        '[data-testid="overlay"]'
      )!;
      overlay.style.opacity = '0.3';
      return getComputedStyle(overlay).opacity;
    });
    expect(opacity).toBe('0.3');
  });
});
