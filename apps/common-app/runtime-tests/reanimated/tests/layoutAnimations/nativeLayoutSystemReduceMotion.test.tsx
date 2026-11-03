/*
 * The system Reduce Motion setting and the native layout route. The app reads the setting at its start
 * (`_REANIMATED_IS_REDUCED_MOTION`), so a run with the setting on needs a new launch of the app after the
 * change. Each test has the expectations of the state that the app read.
 */
import React from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type { SizeBoxProps } from './nativeLayoutTestKit';
import {
  BOX_REF,
  callbackOf,
  callbacks,
  centerOf,
  END_LEFT,
  hasNativeLayoutRoute,
  isHostEvent,
  isNear,
  isNoView,
  layoutOf,
  movingGeometryTest,
  POSITION_TOLERANCE,
  renderBox,
  resetCallbacks,
  sample,
  Scene,
  SizeBox,
  styles,
  summarize,
  takeTrace,
  takeTraceOf,
  waitForCallbacks,
} from './nativeLayoutTestKit';

const IS_REDUCED = !!(global as Record<string, unknown>)
  ._REANIMATED_IS_REDUCED_MOTION;
const STATE = IS_REDUCED ? 'on' : 'off';
const RM_DURATION = 1000;
const READ_MS = 150;
const REFUSED_LAYOUT = 'LayoutBuildFailed:UnsupportedTiming';

const startsOf = (events: { event: string }[]) =>
  events.filter(({ event }) => event === 'Admitted').length;

function EnteringScene({
  isMounted,
  ...box
}: Pick<SizeBoxProps, 'entering' | 'exiting'> & { isMounted: boolean }) {
  return (
    <View style={styles.container}>{isMounted && <SizeBox {...box} />}</View>
  );
}

describe(`native layout with system Reduce Motion ${STATE}`, () => {
  if (!hasNativeLayoutRoute) {
    return;
  }

  test('the app reads the system setting of the device', async () => {
    const accessibility = await AccessibilityInfo.isReduceMotionEnabled();
    console.log(
      `SYSTEM-REDUCE-MOTION | reanimated ${IS_REDUCED} | AccessibilityInfo ${accessibility}`
    );
    expect(accessibility).toBe(IS_REDUCED);
  });

  for (const [leafName, reduceMotion] of [
    ['the default', undefined],
    ['ReduceMotion.System', ReduceMotion.System],
  ] as const) {
    movingGeometryTest(
      `an X layout animation with ${leafName} ${IS_REDUCED ? `starts no native command and ends at once: ${REFUSED_LAYOUT}` : 'plays natively'}`,
      async () => {
        const layout = layoutOf(
          { originX: { duration: RM_DURATION, reduceMotion } },
          { name: 'layout' }
        );
        const tag = await renderBox({ layout });
        resetCallbacks();
        await render(<Scene left={END_LEFT} layout={layout} />);
        await wait(READ_MS);
        const read = await sample(tag, 'PositionX');
        const events = (await takeTraceOf(tag)).filter(isHostEvent);
        if (IS_REDUCED) {
          expect(summarize(events)).toBe(REFUSED_LAYOUT);
          expect(read.playbacks.length).toBe(0);
          expect(
            Math.abs(read.presentation[0] - centerOf(END_LEFT)) <=
              POSITION_TOLERANCE
          ).toBe(true);
          expect(callbacks.join()).toBe('layout:true');
        } else {
          expect(startsOf(events)).toBe(1);
          expect(read.playbacks.length).toBe(1);
          expect(read.presentation[0] < centerOf(END_LEFT) - 5).toBe(true);
          expect(await waitForCallbacks(['layout:true'])).toBe('');
        }
        await render(null);
      }
    );
  }

  movingGeometryTest(
    'an X layout animation with ReduceMotion.Never plays natively',
    async () => {
      const layout = layoutOf(
        {
          originX: { duration: RM_DURATION, reduceMotion: ReduceMotion.Never },
        },
        { name: 'layout' }
      );
      const tag = await renderBox({ layout });
      resetCallbacks();
      await render(<Scene left={END_LEFT} layout={layout} />);
      await wait(READ_MS);
      const read = await sample(tag, 'PositionX');
      const events = (await takeTraceOf(tag)).filter(isHostEvent);
      expect(startsOf(events)).toBe(1);
      expect(read.playbacks.length).toBe(1);
      expect(await waitForCallbacks(['layout:true'])).toBe('');
      await render(null);
    }
  );

  test(`FadeIn ${IS_REDUCED ? 'starts no native command and shows opacity 1 at once' : 'plays natively'}`, async () => {
    const entering = FadeIn.duration(RM_DURATION).withCallback(
      callbackOf('entering')
    );
    await render(<EnteringScene isMounted={false} entering={entering} />);
    await takeTrace();
    resetCallbacks();
    await render(<EnteringScene isMounted entering={entering} />);
    const tag = getTestComponent(BOX_REF).getTag();
    await wait(READ_MS);
    const read = await sample(tag, 'Opacity');
    const events = (await takeTraceOf(tag)).filter(isHostEvent);
    console.log(
      `SYSTEM-REDUCE-MOTION | FadeIn | events ${summarize(events)} | opacity ${read.presentation[0]} | callbacks ${callbacks.join()}`
    );
    if (IS_REDUCED) {
      expect(startsOf(events)).toBe(0);
      expect(read.playbacks.length).toBe(0);
      expect(isNear(read.presentation[0], 1)).toBe(true);
      expect(callbacks.join()).toBe('entering:true');
    } else {
      expect(startsOf(events)).toBe(1);
      expect(read.presentation[0] < 0.5).toBe(true);
      expect(await waitForCallbacks(['entering:true'])).toBe('');
    }
    await render(null);
  });

  test(`FadeOut ${IS_REDUCED ? 'starts no native command and removes the view at once' : 'plays natively'}`, async () => {
    const exiting = FadeOut.duration(RM_DURATION).withCallback(
      callbackOf('exiting')
    );
    await render(<EnteringScene isMounted exiting={exiting} />);
    await wait(50);
    const tag = getTestComponent(BOX_REF).getTag();
    await takeTrace();
    resetCallbacks();
    await render(<EnteringScene isMounted={false} exiting={exiting} />);
    await wait(READ_MS);
    const read = await sample(tag, 'Opacity').catch((error: unknown) => {
      if (isNoView(error)) {
        return undefined;
      }
      throw error;
    });
    const events = (await takeTraceOf(tag)).filter(isHostEvent);
    console.log(
      `SYSTEM-REDUCE-MOTION | FadeOut | events ${summarize(events)} | view ${read === undefined ? 'absent' : `opacity ${read.presentation[0]}`} | callbacks ${callbacks.join()}`
    );
    if (IS_REDUCED) {
      expect(startsOf(events)).toBe(0);
      expect(read === undefined).toBe(true);
      expect(callbacks.join()).toBe('exiting:true');
    } else {
      expect(startsOf(events)).toBe(1);
      expect(read !== undefined && read.presentation[0] > 0.5).toBe(true);
      expect(await waitForCallbacks(['exiting:true'])).toBe('');
    }
    await render(null);
  });
});
