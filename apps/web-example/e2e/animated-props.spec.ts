import { expect, type Page, test } from '@playwright/test';

// Wait time for animations to complete
const ANIMATION_DURATION = 500;
const ANIMATION_WAIT_TIME = ANIMATION_DURATION + 100;

// Constants from AnimatedPropsExample.tsx
// INITIAL_X = CIRCLE_SIZE / 2 = 50 (50 from left/top edge)
// FINAL_X = 180 (50 from right/bottom edge, matching initial distance)
// SVG_SIZE = FINAL_X + CIRCLE_SIZE / 2 = 230
// PROPS_ATTACH_OFFSET = 50 (offset applied when animated props are first attached)
const INITIAL_X = 50;
const INITIAL_Y = 50;
const FINAL_X = 180;
const FINAL_Y = 180;
const PROPS_ATTACH_OFFSET = 50;

const clickAndWait = async (page: Page, testID: string) => {
  await page.getByTestId(testID).click();
  await page.waitForTimeout(ANIMATION_WAIT_TIME);
};

const expectCirclePosition = async (
  page: Page,
  testID: string,
  position: { x?: number; y?: number }
) => {
  const circle = page.getByTestId(testID).locator('circle');
  const [cx, cy] = await Promise.all([
    circle.getAttribute('cx'),
    circle.getAttribute('cy'),
  ]);

  if (position.x !== undefined) {
    expect(parseFloat(cx!)).toBeCloseTo(position.x, 1);
  }
  if (position.y !== undefined) {
    expect(parseFloat(cy!)).toBeCloseTo(position.y, 1);
  }
};

test.describe('AnimatedPropsExample', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/Reanimated/AnimatedPropsExample');
    await page.waitForSelector('text=Test 1: Single Animated Props (Initial)');
  });

  test('Single Animated Props (Initial) - circle animates from initial to final position', async ({
    page,
  }) => {
    await expectCirclePosition(page, 'test-1-circle', {
      x: INITIAL_X,
      y: INITIAL_Y,
    });
    await clickAndWait(page, 'test-1-animate-button');
    await expectCirclePosition(page, 'test-1-circle', {
      x: FINAL_X,
      y: FINAL_Y,
    });
  });

  test('Single Animated Props (Delayed) - circle moves when props are attached and animates to final position', async ({
    page,
  }) => {
    await expectCirclePosition(page, 'test-2-circle', {
      x: INITIAL_X,
      y: INITIAL_Y,
    });
    await clickAndWait(page, 'test-2-attach-button');
    await expectCirclePosition(page, 'test-2-circle', {
      x: INITIAL_X + PROPS_ATTACH_OFFSET,
      y: INITIAL_Y + PROPS_ATTACH_OFFSET,
    });
    await clickAndWait(page, 'test-2-animate-button');
    await expectCirclePosition(page, 'test-2-circle', {
      x: FINAL_X,
      y: FINAL_Y,
    });
  });

  test('Multiple Animated Props (Initial) - circle animates from initial to final position', async ({
    page,
  }) => {
    await expectCirclePosition(page, 'test-3-circle', {
      x: INITIAL_X,
      y: INITIAL_Y,
    });
    await clickAndWait(page, 'test-3-animate-button');
    await expectCirclePosition(page, 'test-3-circle', {
      x: FINAL_X,
      y: FINAL_Y,
    });
  });

  test('Multiple Animated Props (Separate Objects) - animate horizontal first, then attach vertical, then animate vertical', async ({
    page,
  }) => {
    await expectCirclePosition(page, 'test-4-circle', {
      x: INITIAL_X,
      y: INITIAL_Y,
    });
    await clickAndWait(page, 'test-4-animate-horizontal-button');
    await expectCirclePosition(page, 'test-4-circle', {
      x: FINAL_X,
      y: INITIAL_Y,
    });
    await clickAndWait(page, 'test-4-attach-vertical-button');
    await expectCirclePosition(page, 'test-4-circle', {
      x: FINAL_X,
      y: INITIAL_Y + PROPS_ATTACH_OFFSET,
    });
    await clickAndWait(page, 'test-4-animate-vertical-button');
    await expectCirclePosition(page, 'test-4-circle', {
      x: FINAL_X,
      y: FINAL_Y,
    });
  });

  test('Multiple Animated Props (Separate Objects) - attach vertical first, then animate horizontal, then animate vertical', async ({
    page,
  }) => {
    await expectCirclePosition(page, 'test-4-circle', {
      x: INITIAL_X,
      y: INITIAL_Y,
    });
    await clickAndWait(page, 'test-4-attach-vertical-button');
    await expectCirclePosition(page, 'test-4-circle', {
      x: INITIAL_X,
      y: INITIAL_Y + PROPS_ATTACH_OFFSET,
    });
    await clickAndWait(page, 'test-4-animate-horizontal-button');
    await expectCirclePosition(page, 'test-4-circle', {
      x: FINAL_X,
      y: INITIAL_Y + PROPS_ATTACH_OFFSET,
    });
    await clickAndWait(page, 'test-4-animate-vertical-button');
    await expectCirclePosition(page, 'test-4-circle', {
      x: FINAL_X,
      y: FINAL_Y,
    });
  });

  test('Multiple Animated Props (Separate Objects) - attach vertical, animate vertical, then animate horizontal', async ({
    page,
  }) => {
    await expectCirclePosition(page, 'test-4-circle', {
      x: INITIAL_X,
      y: INITIAL_Y,
    });
    await clickAndWait(page, 'test-4-attach-vertical-button');
    await expectCirclePosition(page, 'test-4-circle', {
      x: INITIAL_X,
      y: INITIAL_Y + PROPS_ATTACH_OFFSET,
    });
    await clickAndWait(page, 'test-4-animate-vertical-button');
    await expectCirclePosition(page, 'test-4-circle', {
      x: INITIAL_X,
      y: FINAL_Y,
    });
    await clickAndWait(page, 'test-4-animate-horizontal-button');
    await expectCirclePosition(page, 'test-4-circle', {
      x: FINAL_X,
      y: FINAL_Y,
    });
  });

  test('Multiple Animated Props (Separate Objects) - animate horizontal only', async ({
    page,
  }) => {
    await expectCirclePosition(page, 'test-4-circle', {
      x: INITIAL_X,
      y: INITIAL_Y,
    });
    await clickAndWait(page, 'test-4-animate-horizontal-button');
    await expectCirclePosition(page, 'test-4-circle', {
      x: FINAL_X,
      y: INITIAL_Y,
    });
  });
});
