import {
  clearRenderOutput,
  describe,
  expect,
  expectEventually,
  getTrackerCallCount,
  test,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import {
  ALIGNED,
  alignmentReport,
  DEMO_DURATION_MS,
  describeSharedCases,
  expectAllBoxesToFinish,
  isAttached,
  leakingRegistries,
  NO_LEAKS,
  ON_TIME,
  plainDriver,
  readBoxes,
  SUBTREE_CONSTRUCTED,
  SWITCH_REF,
  travelReport,
  worstAlignmentReport,
} from './fixture';

// The fixture frozen by flipping `<Freeze freeze>` directly - no navigator.

describe('react-freeze *registries*', () => {
  // Whole-app check, so a failure here points at an earlier suite, not this
  // one.
  test('the registries start empty', async () => {
    await clearRenderOutput();

    await expectEventually(leakingRegistries).toBe(NO_LEAKS);
  });
});

describeSharedCases(plainDriver);

describe('react-freeze *prop-driven only*', () => {
  test('the three boxes stay aligned for the whole animation', async () => {
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
