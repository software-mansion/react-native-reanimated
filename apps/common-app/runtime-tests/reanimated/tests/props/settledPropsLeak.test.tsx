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
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import type { SingleViewSnapshot } from '../../../ReJest/TestRunner/UpdatesContainer';
import { ComparisonMode } from '../../../ReJest/types';
import { convertDecimalColor } from '../../../ReJest/utils/util';

// Covers #10140 (settled values leaking into top-level props) and #10339
// (color stuck while the text counts up, with IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS
// on). The runtime-tests app has FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS on
// and the synchronous props paths off. See SettledPropsLeakExample.tsx.

const BOX_REF = 'SETTLED_PROPS_LEAK_BOX';
const FRAMES_DONE = 'SETTLED_PROPS_LEAK_FRAMES_DONE';
const SETTLE_DONE = 'SETTLED_PROPS_LEAK_SETTLE_DONE';

const FROM_COLOR = '#ff0000';
const TO_COLOR = '#00ff00';
const FRAME_INTERVAL_MS = 16;

const SYNC_BACK_DELAY_MS = 2000;

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

function SettledBox({
  durationMs,
  generation,
  mode,
  notification,
  onProps,
}: {
  durationMs: number;
  generation: number;
  mode: Mode;
  notification: string;
  onProps: (props: ReceivedProps) => void;
}) {
  const ref = useTestRef(BOX_REF);
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
  const testID = `settled-box-${generation}`;

  return (
    <View style={styles.container}>
      {mode === 'hooks' && (
        <AnimatedBox
          ref={ref}
          testID={testID}
          style={[styles.box, animatedStyle]}
          animatedProps={animatedProps}
          onProps={onProps}
        />
      )}
      {mode === 'inline' && (
        <AnimatedBox
          ref={ref}
          testID={testID}
          style={[styles.box, { backgroundColor }]}
          // @ts-expect-error `text` is the native prop backing TextInput's value
          text={text}
          defaultValue={text}
          onProps={onProps}
        />
      )}
      {mode === 'styleOnly' && (
        <AnimatedBox
          ref={ref}
          testID={testID}
          style={[styles.box, animatedStyle]}
          onProps={onProps}
        />
      )}
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
  await waitForNotification(FRAMES_DONE);

  // Only the box animates. The recorder files updates under the view
  // descriptor tag, which does not match `findNodeHandle` of a ref forwarded
  // through createAnimatedComponent, so do not pass the component here.
  const jsUpdates = await updatesContainer.getUpdates();
  const nativeSnapshots = await updatesContainer.getNativeSnapshots();
  await stopRecordingAnimationUpdates();
  await unmockAnimationTimer();

  return { jsUpdates, nativeSnapshots };
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
    // Read from the shadow tree when the update was sent, so it shows the
    // commit of the previous frame.
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

// Keys of `from` that are in `keys`, as one string, so a failure names them.
function keysIn(from: object, keys: string[]): string {
  return keys.filter((key) => key in from).join(',');
}

function expectSettledProps(props: ReceivedProps, mode: Mode) {
  const style = flatStyleOf(props);
  expect(colorOf(style.backgroundColor)).toBe(TO_COLOR, ComparisonMode.COLOR);
  // Style keys that leaked into the top-level props.
  expect(keysIn(props, STYLE_KEYS)).toBe('');
  if (mode === 'styleOnly') {
    return;
  }
  expect(props.text as string).toBe('100');
  expect(props.defaultValue as string).toBe('100');
  // Animated props keys that leaked into the style.
  expect(keysIn(style, PROP_KEYS)).toBe('');
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
    '${description} - the color and the text change together on every frame',
    async ({ mode, durationMs }) => {
      const { jsUpdates, nativeSnapshots } = await recordFrames(
        mode,
        durationMs
      );
      const minFrames = Math.floor(durationMs / FRAME_INTERVAL_MS / 2);

      const colors = colorFrames(jsUpdates, nativeSnapshots);
      expect(colors.js.length >= minFrames).toBe(true);
      // The shadow tree follows JS one frame behind. A color stuck on an old
      // frame while the text commits (#10339) breaks this.
      for (let i = 1; i < colors.js.length; i++) {
        expect(colors.native[i]).toBe(colors.js[i - 1], ComparisonMode.COLOR);
      }
      expectNonDecreasing(colors.js.map(greenOf), 'JS color progress');
      expectNonDecreasing(colors.native.map(greenOf), 'native color progress');
      expect(
        colors.native.some((color) => {
          const green = greenOf(color);
          return green > 0 && green < 255;
        })
      ).toBe(true);
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
      const rendersBeforeSync = received.length;
      await wait(SYNC_BACK_DELAY_MS);

      expect(received.length > rendersBeforeSync).toBe(true);
      expectSettledProps(received[received.length - 1], mode);

      const rendersBeforeRerender = received.length;
      await renderBox(1);
      expect(received.length > rendersBeforeRerender).toBe(true);
      expectSettledProps(received[received.length - 1], mode);
      await wait(SYNC_BACK_DELAY_MS);
      expectSettledProps(received[received.length - 1], mode);
      expect(
        await getTestComponent(BOX_REF).getAnimatedStyle('backgroundColor')
      ).toBe(TO_COLOR, ComparisonMode.COLOR);

      // Renders, over the whole test, that got a style key as a top-level prop.
      const leakingRenders = received.filter(
        (props) => keysIn(props, STYLE_KEYS) !== ''
      );
      expect(leakingRenders.length).toBe(0, ComparisonMode.NUMBER);
    }
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  box: {
    height: 100,
    textAlign: 'center',
    width: 100,
  },
});
