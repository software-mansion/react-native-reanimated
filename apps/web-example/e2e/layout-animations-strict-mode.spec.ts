import { expect, type Page, test } from '@playwright/test';

// Wait time for exit animations to complete before checking box count
const ANIMATION_WAIT_TIME = 500;

const getColumnButton = (page: Page, label: string) =>
  page
    .getByTestId(
      label === 'Strict mode' ? 'strict-mode-column' : 'non-strict-column'
    )
    .getByRole('button')
    .filter({ hasText: /^(Show|Hide)$/i });

const countBoxes = async (page: Page) => await page.getByTestId('box').count();

const waitForBoxCount = async (
  page: Page,
  expectedCount: number,
  timeout = 2000
) => {
  // Wait for exit animations to complete before checking
  await page.waitForTimeout(ANIMATION_WAIT_TIME);
  await expect(async () => {
    expect(await countBoxes(page)).toBe(expectedCount);
  }).toPass({ timeout: timeout - ANIMATION_WAIT_TIME });
};

test.describe('StrictModeComparison', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/Reanimated/StrictModeComparison');
    await page.waitForSelector('text=Strict Mode vs Non-Strict Mode');

    // Wait for the state change to make the boxes visible
    await page.waitForTimeout(ANIMATION_WAIT_TIME);
  });

  test('displays 6 red boxes initially', async ({ page }) => {
    await waitForBoxCount(page, 6);
  });

  test('hides and shows boxes in strict mode column', async ({ page }) => {
    const button = getColumnButton(page, 'Strict mode');

    await button.click();
    await waitForBoxCount(page, 3);

    await button.click();
    await waitForBoxCount(page, 6);
  });

  test('hides and shows boxes in non-strict mode column', async ({ page }) => {
    const button = getColumnButton(page, 'Non-strict');

    await button.click();
    await waitForBoxCount(page, 3);

    await button.click();
    await waitForBoxCount(page, 6);
  });

  test('toggles both columns independently', async ({ page }) => {
    await getColumnButton(page, 'Strict mode').click();
    await waitForBoxCount(page, 3);

    await getColumnButton(page, 'Non-strict').click();
    await waitForBoxCount(page, 0, 3000);

    await getColumnButton(page, 'Strict mode').click();
    await waitForBoxCount(page, 3);

    await getColumnButton(page, 'Non-strict').click();
    await waitForBoxCount(page, 6);
  });
});
