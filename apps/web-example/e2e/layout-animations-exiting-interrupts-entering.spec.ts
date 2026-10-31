import { expect, test } from '@playwright/test';

test.describe('ExitingInterruptsEntering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/Reanimated/ExitingInterruptsEntering');
    await page.getByRole('button', { name: 'Show' }).waitFor();
  });

  test('fades out from the current opacity when hidden during the fade-in', async ({
    page,
  }) => {
    // This runs in the page, so the hide lands in the same frame as the opacity reading
    const { opacityAtHide, samplesAfterHide } = await page.evaluate(
      async () => {
        const clickButton = (label: string) =>
          Array.from(document.querySelectorAll<HTMLElement>('[role="button"]'))
            .find((button) => button.textContent === label)
            ?.click();
        // The exiting animation runs on a copy of the square, and the original is hidden
        const getOpacity = () => {
          const square = Array.from(
            document.querySelectorAll<HTMLElement>('[data-testid="square"]')
          ).find(
            (element) =>
              element.isConnected &&
              getComputedStyle(element).visibility !== 'hidden'
          );
          return square ? Number(getComputedStyle(square).opacity) : null;
        };

        clickButton('Show');
        // The 1 s fade-in reaches 30% opacity after about 300 ms
        let opacity = getOpacity();
        for (let frame = 0; frame < 120 && (opacity ?? 0) < 0.3; frame++) {
          await new Promise(requestAnimationFrame);
          opacity = getOpacity();
        }
        clickButton('Hide');
        const hideTime = performance.now();

        // Sample the first half of the 1 s exit, while the copy is still fading out
        const samples: { elapsedMs: number; opacity: number | null }[] = [];
        for (;;) {
          await new Promise(requestAnimationFrame);
          const elapsedMs = performance.now() - hideTime;
          if (elapsedMs >= 500) {
            break;
          }
          samples.push({ elapsedMs, opacity: getOpacity() });
        }
        return { opacityAtHide: opacity ?? 0, samplesAfterHide: samples };
      }
    );

    expect(opacityAtHide).toBeGreaterThanOrEqual(0.3);
    expect(opacityAtHide).toBeLessThan(0.9);
    expect(samplesAfterHide.length).toBeGreaterThan(0);
    for (const { elapsedMs, opacity } of samplesAfterHide) {
      expect(opacity).not.toBeNull();
      // The 1 s fade-out is linear, so it starts at the opacity at Hide and loses that much
      // over 1 s. It shouldn't jump up first, or drop faster than that.
      expect(opacity).toBeLessThanOrEqual(opacityAtHide + 0.02);
      expect(opacity).toBeGreaterThanOrEqual(
        opacityAtHide * (1 - elapsedMs / 1000) - 0.02
      );
    }
  });
});
