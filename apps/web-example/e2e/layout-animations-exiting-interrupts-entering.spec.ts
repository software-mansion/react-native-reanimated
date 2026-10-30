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
    const { opacityAtHide, opacitiesAfterHide } = await page.evaluate(
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

        const opacities: (number | null)[] = [];
        for (let frame = 0; frame < 20; frame++) {
          await new Promise(requestAnimationFrame);
          opacities.push(getOpacity());
        }
        return { opacityAtHide: opacity, opacitiesAfterHide: opacities };
      }
    );

    expect(opacityAtHide).toBeGreaterThanOrEqual(0.3);
    expect(opacityAtHide).toBeLessThan(0.9);
    expect(opacitiesAfterHide).not.toContain(null);
    for (const opacity of opacitiesAfterHide) {
      expect(opacity).toBeLessThanOrEqual((opacityAtHide ?? 0) + 0.05);
    }
  });
});
