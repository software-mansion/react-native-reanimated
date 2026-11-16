import { Platform } from 'react-native';

import {
  clearRenderOutput,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  getTrackerCallCount,
  test,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import {
  ALIGNED,
  alignmentReport,
  CSS_TRANSITION_FADE_REF,
  DEMO_DURATION_MS,
  describeSharedCases,
  expectAllBoxesToFinish,
  isAttached,
  leakingRegistries,
  NO_LEAKS,
  ON_TIME,
  FROM_OPACITY,
  plainDriver,
  PLATFORM_TRANSITIONS,
  readBoxes,
  readMountedOpacity,
  SUBTREE_CONSTRUCTED,
  SWITCH_REF,
  TO_OPACITY,
  travelReport,
  worstAlignmentReport,
} from './fixture';

// The fixture frozen by flipping `<Freeze freeze>` directly - no navigator.

describe('react-freeze *registries*', () => {
  // A failure here points at an earlier suite.
  test('the registries start empty', async () => {
    await clearRenderOutput();

    await expectEventually(leakingRegistries).toBe(NO_LEAKS);
  });
});

describeSharedCases(plainDriver);

describe('react-freeze *prop-driven only*', () => {
  test('the boxes stay aligned for the whole animation', async () => {
    await plainDriver.mount();

    expect(await worstAlignmentReport(DEMO_DURATION_MS)).toBe(ALIGNED);

    await expectAllBoxesToFinish();
  });

  test('a frozen subtree is detached but never torn down', async () => {
    await plainDriver.mount();
    expect(await isAttached(SWITCH_REF)).toBe(true);

    await plainDriver.freeze();

    // React takes a hidden subtree's host views out of the hierarchy.
    expect(await isAttached(SWITCH_REF)).toBe(false);

    await plainDriver.thaw();
    await expectEventually(() => isAttached(SWITCH_REF)).toBe(true);

    expect(await getTrackerCallCount(SUBTREE_CONSTRUCTED)).toBeCalledJS(1);
  });

  test('survives repeated freeze cycles', async () => {
    await plainDriver.mount();

    let previous = await readBoxes();

    // A cadence no navigator can reach.
    for (let cycle = 0; cycle < 3; cycle++) {
      await plainDriver.freeze();
      await wait(150);
      await plainDriver.thaw();
      await waitForFrames(2);

      const current = await readBoxes();
      expect(alignmentReport(current)).toBe(ALIGNED);
      expect(travelReport(previous, current)).toBe(ON_TIME);
      previous = current;
    }

    await expectAllBoxesToFinish();
  });

  test('a platform transition keeps its target in the ShadowTree', async () => {
    if (!PLATFORM_TRANSITIONS) {
      return;
    }

    await plainDriver.mount();

    const committed = Number(
      await getTestComponent(CSS_TRANSITION_FADE_REF).getAnimatedStyle(
        'opacity'
      )
    );
    expect(committed).toBe(TO_OPACITY, ComparisonMode.FLOAT_DISTANCE);

    // On iOS the mounted `alpha` is the target too.
    if (Platform.OS === 'android') {
      const onScreen = await readMountedOpacity(CSS_TRANSITION_FADE_REF);
      expect(onScreen).toBeWithinRange(FROM_OPACITY + 0.01, TO_OPACITY - 0.01);
    }
  });

  test('unmounting a running subtree leaves no records behind', async () => {
    await plainDriver.mount();
    await clearRenderOutput();

    await expectEventually(leakingRegistries).toBe(NO_LEAKS);
  });

  test('unmounting a settled subtree leaves no records behind', async () => {
    await plainDriver.mount();
    await expectAllBoxesToFinish();
    await clearRenderOutput();

    await expectEventually(leakingRegistries).toBe(NO_LEAKS);
  });
});
