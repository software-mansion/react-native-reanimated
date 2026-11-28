// Covers the SettledPropsLeakExample screen, a manual check for two bugs of
// a wrapped component (`createAnimatedComponent` over a `TextInput`) whose
// background color animates from red to lime and whose text counts to 100:
// - #10140: the settled props sync spread animated style values into the
//   component's top-level props. Checked on the props React passes to the
//   wrapped component (`onProps`), after settle, after a re-render and after a
//   quiet period.
// - #10339: the color stayed red while the text counted up. Checked frame by
//   frame on the JS updates and native snapshots of the recorder, and on the
//   mounted view (`getMountedViewProps`). The runtime-tests app builds with
//   IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS off, so the synchronous path of that bug
//   stays a manual check on the screen.
// The last group runs two boxes side by side, as the screen did, because
// bugs in the shared settle sync often need several views.

import type { ComponentRef } from 'react';
import { forwardRef, useEffect } from 'react';
import type { TextInputProps, ViewStyle } from 'react-native';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getTestComponent,
  mockAnimationTimer,
  notify,
  recordAnimationUpdates,
  render,
  stopRecordingAnimationUpdates,
  test,
  unmockAnimationTimer,
  useTestRef,
  wait,
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import type { SingleViewSnapshot } from '../../../ReJest/TestRunner/UpdatesContainer';
import { ComparisonMode } from '../../../ReJest/types';
import { convertDecimalColor } from '../../../ReJest/utils/util';

const BOX_REF = 'SETTLED_PROPS_LEAK_BOX';
const FAST_REF = 'SETTLED_PROPS_LEAK_FAST';
const SLOW_REF = 'SETTLED_PROPS_LEAK_SLOW';
const FRAMES_DONE = 'SETTLED_PROPS_LEAK_FRAMES_DONE';
const SETTLE_DONE = 'SETTLED_PROPS_LEAK_SETTLE_DONE';
const FAST_DONE = 'SETTLED_PROPS_LEAK_FAST_DONE';
const SLOW_DONE = 'SETTLED_PROPS_LEAK_SLOW_DONE';

const FROM_COLOR = '#ff0000';
const TO_COLOR = '#00ff00';
const FRAME_INTERVAL_MS = 16;

// Native code treats a view as settled once it has had no animated write for
// SETTLED_ANIMATION_THRESHOLD_MS (ReanimatedModuleProxy::getSettledUpdates),
// and JS collects settled views every FLUSH_INTERVAL_MS
// (PropsRegistryGarbageCollector.native.ts).
const SETTLE_THRESHOLD_MS = 1000;
const FLUSH_INTERVAL_MS = 500;
// The sync render comes at most SETTLE_THRESHOLD_MS + FLUSH_INTERVAL_MS after
// the last frame. Doubled for a slow emulator.
const SYNC_TIMEOUT_MS = 2 * (SETTLE_THRESHOLD_MS + FLUSH_INTERVAL_MS);
// A second sync or a revert after a render would show up within one settle
// threshold and one more flush, so nothing may change during this time.
const QUIET_PERIOD_MS = SETTLE_THRESHOLD_MS + 2 * FLUSH_INTERVAL_MS;

// The fast box settles FAST_DURATION_MS + SETTLE_THRESHOLD_MS = 1.3 s after
// the start and gets its sync render by 1.8 s, so the slow box must still
// animate well past that. The 1000 ms box of the screen has already stopped
// writing by then. That state, where only hasPendingSettledUpdates keeps the
// sync interval alive, is covered by the single-box 1000 ms cases above.
const FAST_DURATION_MS = 300;
const SLOW_DURATION_MS = 4000;

type Mode = 'hooks' | 'inline' | 'styleOnly';
type ReceivedProps = Record<string, unknown> & { style?: unknown };

type BoxProps = TextInputProps & {
  onProps: (props: ReceivedProps) => void;
};

const Box = forwardRef<ComponentRef<typeof TextInput>, BoxProps>(
  ({ onProps, ...props }, ref) => {
    onProps(props as ReceivedProps);
    return <TextInput ref={ref} editable={false} {...props} />;
  }
);

const AnimatedBox = Animated.createAnimatedComponent(Box);

type TestBoxProps = {
  refName: string;
  durationMs: number;
  generation: number;
  mode: Mode;
  notification: string;
  onProps: (props: ReceivedProps) => void;
};

// One box of the screen: its own progress animates the background color from
// red to lime and the text from 0 to 100.
function TestBox({
  refName,
  durationMs,
  generation,
  mode,
  notification,
  onProps,
}: TestBoxProps) {
  const ref = useTestRef(refName);
  const progress = useSharedValue(0);

  const text = useDerivedValue(() => `${Math.round(progress.value * 100)}`);
  const backgroundColor = useDerivedValue(() =>
    interpolateColor(progress.value, [0, 1], [FROM_COLOR, TO_COLOR])
  );

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [FROM_COLOR, TO_COLOR]
    ),
  }));

  const animatedProps = useAnimatedProps(() => ({
    text: text.value,
    defaultValue: text.value,
  }));

  useEffect(() => {
    progress.value = withTiming(1, { duration: durationMs }, (finished) => {
      if (finished) {
        notify(notification);
      }
    });
  }, [durationMs, notification, progress]);

  // `generation` changes a native prop, so a new render always commits.
  const testID = `${refName}-${generation}`;

  if (mode === 'inline') {
    return (
      <AnimatedBox
        ref={ref}
        testID={testID}
        style={[styles.box, { backgroundColor }]}
        // @ts-expect-error `text` is the native prop backing TextInput's value
        text={text}
        defaultValue={text}
        onProps={onProps}
      />
    );
  }
  return (
    <AnimatedBox
      ref={ref}
      testID={testID}
      style={[styles.box, animatedStyle]}
      animatedProps={mode === 'hooks' ? animatedProps : undefined}
      onProps={onProps}
    />
  );
}

function SettledBox(props: Omit<TestBoxProps, 'refName'>) {
  return (
    <View style={styles.container}>
      <TestBox refName={BOX_REF} {...props} />
    </View>
  );
}

// The two boxes of one row of the screen, with durations that make them overlap.
function FastAndSlowBoxes({
  mode,
  onFastProps,
  onSlowProps,
}: {
  mode: Mode;
  onFastProps: (props: ReceivedProps) => void;
  onSlowProps: (props: ReceivedProps) => void;
}) {
  return (
    <View style={[styles.container, styles.row]}>
      <TestBox
        refName={FAST_REF}
        durationMs={FAST_DURATION_MS}
        generation={0}
        mode={mode}
        notification={FAST_DONE}
        onProps={onFastProps}
      />
      <TestBox
        refName={SLOW_REF}
        durationMs={SLOW_DURATION_MS}
        generation={0}
        mode={mode}
        notification={SLOW_DONE}
        onProps={onSlowProps}
      />
    </View>
  );
}

function colorOf(value: unknown): string {
  return typeof value === 'number' ? convertDecimalColor(value) : String(value);
}

function greenOf(color: string): number {
  return parseInt(color.slice(3, 5), 16);
}

function flatStyleOf(props: ReceivedProps): ViewStyle {
  return (StyleSheet.flatten(props.style as ViewStyle) ?? {}) as ViewStyle;
}

function expectNonDecreasing(values: number[], what: string) {
  const backSteps = values.filter(
    (value, index) => index > 0 && value < values[index - 1]
  );
  if (backSteps.length > 0) {
    console.log(`${what} went back: ${JSON.stringify(values)}`);
  }
  expect(backSteps.length).toBe(0, ComparisonMode.NUMBER);
}

async function mountedColor(refName = BOX_REF): Promise<string | undefined> {
  return (await getTestComponent(refName).getMountedViewProps())
    ?.backgroundColor;
}

// Reads the mounted view once per frame until `finished` settles. #10339
// showed only there: the color stayed red while the text counted up. A read is
// a JS -> UI -> JS round trip that does not wait for a frame, so the loop waits
// for one between reads instead of flooding the UI thread under test. A 300 ms
// animation (about 19 mocked frames) gets about 19 samples. The loop also ends
// when `finished` rejects, for example on a timeout, and the rejection is
// passed on.
async function sampleMountedColors(
  finished: Promise<unknown>,
  refName = BOX_REF
) {
  let done = false;
  const ended = finished.finally(() => {
    done = true;
  });
  const samples: string[] = [];
  while (!done) {
    const color = await mountedColor(refName);
    if (color !== undefined) {
      samples.push(color);
    }
    await waitForFrames(1);
  }
  await ended;
  return samples;
}

function isBetween(color: string) {
  const green = greenOf(color);
  return green > 0 && green < 255;
}

async function recordFrames(mode: Mode, durationMs: number) {
  await mockAnimationTimer();
  const updatesContainer = await recordAnimationUpdates();

  await render(
    <SettledBox
      durationMs={durationMs}
      generation={0}
      mode={mode}
      notification={FRAMES_DONE}
      onProps={() => {}}
    />
  );
  const mountedColors = await sampleMountedColors(
    waitForNotification(FRAMES_DONE)
  );

  // Read the updates without a component. Operations sent to `_updateProps`
  // carry no view tag, so the recorder files every update under -1 (see the
  // TODO in TestsOfTestingFramework.test.tsx) and a lookup by the box's tag
  // finds nothing. Only the box animates, so all updates are its own.
  const jsUpdates = await updatesContainer.getUpdates();
  const nativeSnapshots = await updatesContainer.getNativeSnapshots();
  await stopRecordingAnimationUpdates();
  await unmockAnimationTimer();

  return { jsUpdates, nativeSnapshots, mountedColors };
}

function colorFrames(
  jsUpdates: SingleViewSnapshot,
  nativeSnapshots: SingleViewSnapshot
) {
  const indices = jsUpdates
    .map((update, index) => ('backgroundColor' in update ? index : -1))
    .filter((index) => index >= 0);
  return {
    js: indices.map((index) => colorAt(jsUpdates, index)),
    native: indices.map((index) => colorAt(nativeSnapshots, index)),
  };
}

function colorAt(frames: SingleViewSnapshot, index: number): string {
  return colorOf(
    (frames[index] as { backgroundColor?: unknown } | undefined)
      ?.backgroundColor
  );
}

function textFrames(jsUpdates: SingleViewSnapshot): number[] {
  return jsUpdates
    .filter((update) => 'text' in update)
    .map((update) => Number((update as { text?: unknown }).text));
}

const STYLE_KEYS = ['backgroundColor'];
const PROP_KEYS = ['text', 'defaultValue'];

function keysIn(from: object, keys: string[]): string {
  return keys.filter((key) => key in from).join(',');
}

function expectSettledProps(props: ReceivedProps, mode: Mode) {
  const style = flatStyleOf(props);
  expect(colorOf(style.backgroundColor)).toBe(TO_COLOR, ComparisonMode.COLOR);
  expect(keysIn(props, STYLE_KEYS)).toBe('');
  if (mode === 'styleOnly') {
    return;
  }
  expect(props.text as string).toBe('100');
  expect(props.defaultValue as string).toBe('100');
  expect(keysIn(style, PROP_KEYS)).toBe('');
}

function leakingRenders(received: ReceivedProps[]) {
  return received.filter((props) => keysIn(props, STYLE_KEYS) !== '').length;
}

// Waits for the render that the settled props sync sends after `before`
// renders, instead of a fixed delay.
async function expectSyncRender(received: ReceivedProps[], before: number) {
  await expectEventually(
    () => received.length,
    SYNC_TIMEOUT_MS
  ).toBeWithinRange(before + 1, Number.MAX_SAFE_INTEGER);
}

const cases = [
  {
    description: 'useAnimatedStyle and useAnimatedProps, 300 ms',
    mode: 'hooks' as const,
    durationMs: 300,
  },
  {
    description: 'useAnimatedStyle and useAnimatedProps, 1000 ms',
    mode: 'hooks' as const,
    durationMs: 1000,
  },
  {
    description: 'inline shared values in style and props, 300 ms',
    mode: 'inline' as const,
    durationMs: 300,
  },
  {
    description: 'inline shared values in style and props, 1000 ms',
    mode: 'inline' as const,
    durationMs: 1000,
  },
  {
    description: 'useAnimatedStyle only, 300 ms',
    mode: 'styleOnly' as const,
    durationMs: 300,
  },
  {
    description: 'useAnimatedStyle only, 1000 ms',
    mode: 'styleOnly' as const,
    durationMs: 1000,
  },
];

describe('settled animated style and props of a wrapped component', () => {
  test.each(cases)(
    '${description} - the color and the text animate frame by frame and settle',
    async ({ mode, durationMs }) => {
      const { jsUpdates, nativeSnapshots, mountedColors } = await recordFrames(
        mode,
        durationMs
      );
      const minFrames = Math.floor(durationMs / FRAME_INTERVAL_MS / 2);

      const colors = colorFrames(jsUpdates, nativeSnapshots);
      expect(colors.js.length >= minFrames).toBe(true);
      // The shadow tree follows JS one frame behind.
      for (let i = 1; i < colors.js.length; i++) {
        expect(colors.native[i]).toBe(colors.js[i - 1], ComparisonMode.COLOR);
      }
      expectNonDecreasing(colors.js.map(greenOf), 'JS color progress');
      expectNonDecreasing(colors.native.map(greenOf), 'native color progress');
      expect(colors.native.some(isBetween)).toBe(true);
      // The mounted view also passes through in-between colors and never goes
      // back. The runtime-tests app builds with
      // IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS off, so this does not cover the
      // synchronous path of #10339, only the mount layer.
      expectNonDecreasing(mountedColors.map(greenOf), 'mounted color progress');
      expect(mountedColors.some(isBetween)).toBe(true);
      expect(colors.js[colors.js.length - 1]).toBe(
        TO_COLOR,
        ComparisonMode.COLOR
      );

      const texts = textFrames(jsUpdates);
      if (mode === 'styleOnly') {
        expect(texts.length).toBe(0, ComparisonMode.NUMBER);
      } else {
        expect(texts.length >= minFrames).toBe(true);
        expectNonDecreasing(texts, 'text');
        expect(texts[texts.length - 1]).toBe(100, ComparisonMode.NUMBER);
      }

      await expectEventually(() =>
        getTestComponent(BOX_REF).getAnimatedStyle('backgroundColor')
      ).toBe(TO_COLOR, ComparisonMode.COLOR);
    }
  );

  test.each(cases)(
    '${description} - after settle React gets the color only in style and the text only as a prop',
    async ({ mode, durationMs }) => {
      const received: ReceivedProps[] = [];
      const onProps = (props: ReceivedProps) => {
        received.push(props);
      };
      const renderBox = (generation: number) =>
        render(
          <SettledBox
            durationMs={durationMs}
            generation={generation}
            mode={mode}
            notification={SETTLE_DONE}
            onProps={onProps}
          />
        );

      await renderBox(0);
      await waitForNotification(SETTLE_DONE);
      await expectSyncRender(received, received.length);
      expectSettledProps(received[received.length - 1], mode);
      expect(await mountedColor()).toBe(TO_COLOR, ComparisonMode.COLOR);

      const rendersBeforeRerender = received.length;
      await renderBox(1);
      expect(received.length > rendersBeforeRerender).toBe(true);
      expectSettledProps(received[received.length - 1], mode);
      await expectEventually(() => mountedColor()).toBe(
        TO_COLOR,
        ComparisonMode.COLOR
      );
      // The only fixed wait: nothing may change after the render.
      await wait(QUIET_PERIOD_MS);
      expectSettledProps(received[received.length - 1], mode);
      expect(
        await getTestComponent(BOX_REF).getAnimatedStyle('backgroundColor')
      ).toBe(TO_COLOR, ComparisonMode.COLOR);
      expect(await mountedColor()).toBe(TO_COLOR, ComparisonMode.COLOR);

      expect(leakingRenders(received)).toBe(0, ComparisonMode.NUMBER);
    }
  );

  // The screen showed a 300 ms and a 1000 ms box side by side in each row.
  // Settle-sync bugs often need several views, so one box settles and gets
  // its sync render while the other still animates.
  test.each([
    { description: 'useAnimatedStyle and useAnimatedProps', mode: 'hooks' },
    { description: 'inline shared values in style and props', mode: 'inline' },
    { description: 'useAnimatedStyle only', mode: 'styleOnly' },
  ] as const)(
    '${description} - a box that settles while another still animates gets its own sync render',
    async ({ mode }) => {
      const fastReceived: ReceivedProps[] = [];
      const slowReceived: ReceivedProps[] = [];
      await render(
        <FastAndSlowBoxes
          mode={mode}
          onFastProps={(props) => fastReceived.push(props)}
          onSlowProps={(props) => slowReceived.push(props)}
        />
      );

      await waitForNotification(FAST_DONE);
      await expectSyncRender(fastReceived, fastReceived.length);
      // Without this the test could pass with no overlap at all.
      const slowAtFastSync = await mountedColor(SLOW_REF);
      expect(isBetween(colorOf(slowAtFastSync))).toBe(true);
      expectSettledProps(fastReceived[fastReceived.length - 1], mode);
      expect(await mountedColor(FAST_REF)).toBe(TO_COLOR, ComparisonMode.COLOR);

      // The fast box's render neither resets nor freezes the slow box.
      const slowColors = await sampleMountedColors(
        waitForNotification(SLOW_DONE),
        SLOW_REF
      );
      expectNonDecreasing(
        [colorOf(slowAtFastSync), ...slowColors].map(greenOf),
        'slow box color after the fast box synced'
      );
      expect(slowColors.some(isBetween)).toBe(true);

      await expectSyncRender(slowReceived, slowReceived.length);
      expectSettledProps(slowReceived[slowReceived.length - 1], mode);
      await expectEventually(() => mountedColor(SLOW_REF)).toBe(
        TO_COLOR,
        ComparisonMode.COLOR
      );
      expectSettledProps(fastReceived[fastReceived.length - 1], mode);
      expect(await mountedColor(FAST_REF)).toBe(TO_COLOR, ComparisonMode.COLOR);

      expect(leakingRenders(fastReceived)).toBe(0, ComparisonMode.NUMBER);
      expect(leakingRenders(slowReceived)).toBe(0, ComparisonMode.NUMBER);
    }
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  box: {
    height: 100,
    textAlign: 'center',
    width: 100,
  },
});
