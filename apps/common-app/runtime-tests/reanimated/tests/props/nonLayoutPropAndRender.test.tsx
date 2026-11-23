import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  makeMutable,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  advanceAnimationTimer,
  clearRenderOutput,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  mockAnimationTimer,
  recordAnimationUpdates,
  render,
  stopRecordingAnimationUpdates,
  test,
  unmockAnimationTimer,
  useTestRef,
  wait,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import type { SingleViewSnapshot } from '../../../ReJest/TestRunner/UpdatesContainer';
import { ComparisonMode } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';
import { convertDecimalColor } from '../../../ReJest/utils/util';

const BOX_REF = 'NON_LAYOUT_PROP_BOX';
const DURATION_MS = 300;
const RECORDED_FRAMES = 12;
const FRAME_INTERVAL_MS = 16;
const ANIMATION_FRAMES = Math.ceil(DURATION_MS / FRAME_INTERVAL_MS);

const COLOR_OFF = '#00ffff';
const COLOR_ON = '#ff0000';
const SIZE_BIG = 200;
const SIZE_SMALL = 100;

function ColorBox({ color, size }: { color: string; size: number }) {
  const ref = useTestRef(BOX_REF);
  const sv = useSharedValue(color);

  useEffect(() => {
    sv.value = color;
  }, [color, sv]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(sv.value, { duration: DURATION_MS }),
    };
  });

  return (
    <Animated.View
      ref={ref}
      style={[{ height: size, width: size }, animatedStyle]}
    />
  );
}

function NonLayoutPropBox({
  colorToggled,
  size,
}: {
  colorToggled: boolean;
  size: number;
}) {
  return (
    <View style={styles.container}>
      <ColorBox color={colorToggled ? COLOR_ON : COLOR_OFF} size={size} />
    </View>
  );
}

function RecordedColorBox({
  color,
  size,
}: {
  color: SharedValue<string>;
  size: number;
}) {
  const ref = useTestRef(BOX_REF);
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(color.value, { duration: DURATION_MS }),
  }));

  return (
    <View style={styles.container}>
      <Animated.View
        ref={ref}
        style={[{ height: size, width: size }, animatedStyle]}
      />
    </View>
  );
}

async function expectBox(size: number, color: string) {
  const box = getTestComponent(BOX_REF);
  await expectEventually(() => box.getAnimatedStyle('width')).toBe(
    size,
    ComparisonMode.PIXEL
  );
  await expectEventually(() => box.getAnimatedStyle('height')).toBe(
    size,
    ComparisonMode.PIXEL
  );
  await expectEventually(
    () => box.getAnimatedStyle('backgroundColor'),
    5000
  ).toBe(color, ComparisonMode.COLOR);
}

async function expectBoxStaysSettled(size: number, color: string) {
  const component = getTestComponent(BOX_REF);
  await expectEventually(
    async () => (await component.getMountedViewProps())?.backgroundColor
  ).toBe(color, ComparisonMode.COLOR);
  await expectBox(size, color);
  await wait(DURATION_MS + FRAME_INTERVAL_MS + 4);
  const box = getTestComponent(BOX_REF);
  expect(await box.getAnimatedStyle('width')).toBe(size, ComparisonMode.PIXEL);
  expect(await box.getAnimatedStyle('backgroundColor')).toBe(
    color,
    ComparisonMode.COLOR
  );
}

function colorOf(frame: SingleViewSnapshot[number]): string {
  const color = (frame as { backgroundColor?: unknown }).backgroundColor;
  return typeof color === 'number' ? convertDecimalColor(color) : String(color);
}

function toColorFrames(snapshot: SingleViewSnapshot): SingleViewSnapshot {
  return snapshot.map((update) => {
    return { backgroundColor: colorOf(update) };
  });
}

function dropRepeatedFrames(frames: SingleViewSnapshot): SingleViewSnapshot {
  return frames.filter(
    (frame, index) =>
      index === 0 || colorOf(frame) !== colorOf(frames[index - 1])
  );
}

function progressFrames(
  frames: SingleViewSnapshot,
  toColor: string
): Array<number> {
  return frames.map((frame) => {
    const red = parseInt(colorOf(frame).slice(1, 3), 16);
    return toColor === COLOR_ON ? red : 255 - red;
  });
}

async function recordColorFrames(
  fromColor: string,
  toColor: string,
  resizeFrame: number | null
) {
  await clearRenderOutput();
  const color = makeMutable(fromColor);
  await mockAnimationTimer({ autoAdvance: false });
  await render(<RecordedColorBox color={color} size={SIZE_BIG} />);
  await advanceAnimationTimer(DURATION_MS);
  const updatesContainer = await recordAnimationUpdates({
    nativeSource: 'mountedView',
  });
  await runOnUIBlocking(() => {
    'worklet';
    color.value = toColor;
  });
  await waitForFrames(1);

  const box = getTestComponent(BOX_REF);
  for (let frame = 0; frame < ANIMATION_FRAMES; frame++) {
    if (frame === resizeFrame) {
      await render(<RecordedColorBox color={color} size={SIZE_SMALL} />);
      await expectEventually(
        async () => (await box.getMountedViewProps())?.height
      ).toBe(SIZE_SMALL, ComparisonMode.PIXEL);
    }
    await advanceAnimationTimer(FRAME_INTERVAL_MS);
  }
  await expectEventually(
    async () => (await box.getMountedViewProps())?.backgroundColor
  ).toBe(toColor, ComparisonMode.COLOR);

  await stopRecordingAnimationUpdates();
  const snapshots = await updatesContainer.getSnapshots();
  const frames = toColorFrames(snapshots.updates);
  const nativeFrames = toColorFrames(snapshots.nativeSnapshots);
  await unmockAnimationTimer();

  return { frames, nativeFrames };
}

const recordedCases = [
  {
    description: 'right after the color toggle',
    fromColor: COLOR_OFF,
    resizeFrame: 0,
    toColor: COLOR_ON,
  },
  {
    description: 'a third into the off-to-on animation',
    fromColor: COLOR_OFF,
    resizeFrame: 6,
    toColor: COLOR_ON,
  },
  {
    description: 'a third into the on-to-off animation',
    fromColor: COLOR_ON,
    resizeFrame: 6,
    toColor: COLOR_OFF,
  },
];

describe('animation of a non-layout prop across React renders', () => {
  test('a size render after the animation settles keeps the color', async () => {
    await render(<NonLayoutPropBox colorToggled={false} size={SIZE_BIG} />);
    await expectBox(SIZE_BIG, COLOR_OFF);

    await render(<NonLayoutPropBox size={SIZE_BIG} colorToggled />);
    await expectBoxStaysSettled(SIZE_BIG, COLOR_ON);

    await render(<NonLayoutPropBox size={SIZE_SMALL} colorToggled />);
    await expectBoxStaysSettled(SIZE_SMALL, COLOR_ON);
  });

  test('a size render right after a color toggle keeps both updates', async () => {
    await render(<NonLayoutPropBox colorToggled={false} size={SIZE_BIG} />);
    await expectBox(SIZE_BIG, COLOR_OFF);

    await render(<NonLayoutPropBox size={SIZE_BIG} colorToggled />);
    await render(<NonLayoutPropBox size={SIZE_SMALL} colorToggled />);
    await expectBoxStaysSettled(SIZE_SMALL, COLOR_ON);
  });

  test('a size render during the on-to-off animation keeps both updates', async () => {
    await render(<NonLayoutPropBox colorToggled={false} size={SIZE_BIG} />);
    await expectBox(SIZE_BIG, COLOR_OFF);

    await render(<NonLayoutPropBox size={SIZE_BIG} colorToggled />);
    await expectBoxStaysSettled(SIZE_BIG, COLOR_ON);

    await render(<NonLayoutPropBox colorToggled={false} size={SIZE_BIG} />);
    await render(<NonLayoutPropBox colorToggled={false} size={SIZE_SMALL} />);
    await expectBoxStaysSettled(SIZE_SMALL, COLOR_OFF);
  });

  test('a color toggle after a size render still animates the color', async () => {
    await render(<NonLayoutPropBox colorToggled={false} size={SIZE_BIG} />);
    await expectBox(SIZE_BIG, COLOR_OFF);

    await render(<NonLayoutPropBox colorToggled={false} size={SIZE_SMALL} />);
    await expectBoxStaysSettled(SIZE_SMALL, COLOR_OFF);

    await render(<NonLayoutPropBox size={SIZE_SMALL} colorToggled />);
    await expectBoxStaysSettled(SIZE_SMALL, COLOR_ON);

    await render(<NonLayoutPropBox colorToggled={false} size={SIZE_SMALL} />);
    await expectBoxStaysSettled(SIZE_SMALL, COLOR_OFF);
  });

  test('alternating color toggles and size renders end in the last requested state', async () => {
    await render(<NonLayoutPropBox colorToggled={false} size={SIZE_BIG} />);
    await expectBox(SIZE_BIG, COLOR_OFF);

    await render(<NonLayoutPropBox size={SIZE_SMALL} colorToggled />);
    await render(<NonLayoutPropBox colorToggled={false} size={SIZE_BIG} />);
    await render(<NonLayoutPropBox size={SIZE_SMALL} colorToggled />);
    await expectBoxStaysSettled(SIZE_SMALL, COLOR_ON);
  });

  test.each(recordedCases)(
    'a size render ${description} keeps every color frame',
    async ({ fromColor, resizeFrame, toColor }) => {
      const reference = await recordColorFrames(fromColor, toColor, null);
      const observed = await recordColorFrames(fromColor, toColor, resizeFrame);

      expect(observed.frames).toMatchNativeSnapshots(
        observed.nativeFrames,
        false,
        0
      );

      expect(reference.frames.length).toBeWithinRange(
        RECORDED_FRAMES,
        Infinity
      );
      expect(observed.frames.length).toBeWithinRange(RECORDED_FRAMES, Infinity);
      const expected = dropRepeatedFrames(
        reference.frames.slice(0, RECORDED_FRAMES)
      );
      const received = dropRepeatedFrames(
        observed.frames.slice(0, RECORDED_FRAMES)
      );
      expect(received.length).toBeWithinRange(expected.length - 1, Infinity);

      const compared = Math.min(expected.length, received.length);
      expect(received.slice(0, compared)).toMatchSnapshots(
        expected.slice(0, compared)
      );

      const progress = progressFrames(observed.frames, toColor);
      for (let i = 1; i < progress.length; i++) {
        expect(progress[i]).toBeWithinRange(progress[i - 1], 255);
      }
      expect(progress[progress.length - 1]).toBeWithinRange(
        progress[resizeFrame] + 1,
        255
      );

      await expectBox(SIZE_SMALL, toColor);
    }
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
