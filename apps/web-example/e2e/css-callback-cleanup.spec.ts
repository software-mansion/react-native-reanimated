import { expect, test } from '@playwright/test';

import {
  type CancellationLog,
  EFFECT_DURATION_SECONDS,
  prepareCancellationPage,
  runCancellationScenario,
} from './helpers/css-callback-cleanup';

test.describe('CSS cancellation callbacks during cleanup', () => {
  test.beforeEach(async ({ page }) => {
    await prepareCancellationPage(page);
  });

  test('delivers every cancellation, then removes listeners, when elements leave the DOM', async ({
    page,
  }) => {
    const result = await runCancellationScenario(page, 'remove-elements');
    expectCancellationsDeliveredAndListenersRemoved(result);
  });

  test('preserves cancellations when removal occurs inside another animation event', async ({
    page,
  }) => {
    const result = await runCancellationScenario(
      page,
      'remove-during-animation-event'
    );
    expectCancellationsDeliveredAndListenersRemoved(result);
  });

  test('delivers cancellations when elements are hidden after cleanup is scheduled', async ({
    page,
  }) => {
    // This tests display:none after explicit cleanup, not React's hide lifecycle.
    const result = await runCancellationScenario(
      page,
      'hide-elements-after-scheduling-cleanup'
    );
    expectCancellationsDeliveredAndListenersRemoved(result);
  });
});

function expectCancellationsDeliveredAndListenersRemoved(result: {
  animations: CancellationLog;
  transitions: CancellationLog;
}) {
  expectCancellationEvents(result.animations, ['fade', 'slide']);
  expectCancellationEvents(result.transitions, ['opacity', 'transform']);
}

function expectCancellationEvents(
  log: CancellationLog,
  expectedNames: string[]
) {
  expect(
    log.nativeNames.toSorted(),
    'the browser cancels both active effects'
  ).toEqual(expectedNames);
  expect(
    log.callbackNames.toSorted(),
    'library callbacks match native events, without post-cleanup sentinels'
  ).toEqual(log.nativeNames.toSorted());
  expect(log.elapsedTimes).toHaveLength(expectedNames.length);
  for (const elapsedTime of log.elapsedTimes) {
    expect(elapsedTime).toBeGreaterThan(0);
    expect(elapsedTime).toBeLessThan(EFFECT_DURATION_SECONDS);
  }
}
