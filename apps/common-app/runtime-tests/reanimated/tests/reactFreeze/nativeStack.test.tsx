import {
  clearRenderOutput,
  describe,
  expect,
  expectEventually,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import {
  ALIGNED,
  ALIGNMENT_WATCH_MS,
  alignmentReport,
  describeSharedCases,
  expectAllBoxesToFinish,
  FREEZE_MS,
  goHome,
  IN_RANGE,
  leakingRegistries,
  MIDPOINT,
  navigatorDriver,
  NO_LEAKS,
  ON_TIME,
  press,
  rangeReport,
  readBoxes,
  SCREEN_1_TO_SCREEN_2,
  SCREEN_2_TO_SCREEN_3,
  SHORT_FREEZE_MS,
  TO,
  travelReport,
  waitForControl,
  worstAlignmentReport,
} from './fixture';

// The fixture frozen the way the example screen does it: by pushing a native
// stack screen over it.

describeSharedCases(navigatorDriver);

describe('react-freeze *under a native stack only*', () => {
  /** Home -> 1 -> 2 -> 3, dwelling on each one. */
  async function goThreeScreensDeep(dwellMs: number) {
    await navigatorDriver.freeze();
    await wait(dwellMs);
    await press(SCREEN_1_TO_SCREEN_2);
    await waitForControl(SCREEN_2_TO_SCREEN_3, true);
    await wait(dwellMs);
    await press(SCREEN_2_TO_SCREEN_3);
    await waitForControl('screen3/goBack', true);
    await wait(dwellMs);
  }

  test('the boxes keep animating three screens deep', async () => {
    await navigatorDriver.mount();
    expect(await worstAlignmentReport(ALIGNMENT_WATCH_MS)).toBe(ALIGNED);

    const before = await readBoxes();

    await goThreeScreensDeep(FREEZE_MS / 3);
    await goHome();

    const after = await readBoxes();

    // Home freezes once however deep the stack goes: pushing 2 and 3 never
    // touches it, so only the number of transitions differs from the shallow
    // case.
    expect(await worstAlignmentReport(ALIGNMENT_WATCH_MS)).toBe(ALIGNED);
    expect(rangeReport(after, MIDPOINT, TO - 1)).toBe(IN_RANGE);
    expect(travelReport(before, after)).toBe(ON_TIME);

    await expectAllBoxesToFinish();
  });

  test('a second round trip picks up where the first one left off', async () => {
    await navigatorDriver.mount();

    let previous = await readBoxes();

    for (let trip = 0; trip < 2; trip++) {
      await navigatorDriver.freeze();
      await wait(SHORT_FREEZE_MS);
      await navigatorDriver.thaw();

      const current = await readBoxes();
      expect(alignmentReport(current)).toBe(ALIGNED);
      expect(travelReport(previous, current)).toBe(ON_TIME);
      previous = current;
    }

    await expectAllBoxesToFinish();
  });

  test('unmounting the navigator three screens deep leaves no records behind', async () => {
    await navigatorDriver.mount();
    await goThreeScreensDeep(SHORT_FREEZE_MS / 3);

    await clearRenderOutput();

    await expectEventually(leakingRegistries).toBe(NO_LEAKS);
  });
});
