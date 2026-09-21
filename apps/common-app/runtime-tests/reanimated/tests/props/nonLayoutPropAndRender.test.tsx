import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
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
  test,
  unmockAnimationTimer,
  useTestRef,
  wait,
  waitForAnimationUpdates,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import type { SingleViewSnapshot } from '../../../ReJest/TestRunner/UpdatesContainer';
import { ComparisonMode } from '../../../ReJest/types';
import { convertDecimalColor } from '../../../ReJest/utils/util';

const BOX_REF = 'NON_LAYOUT_PROP_BOX';
const SEQUENCE_DONE = 'NON_LAYOUT_PROP_SEQUENCE_DONE';
// Under the ~19 frames of the 300 ms animation; asking for more times out.
const RECORDED_FRAMES = 12;
// A third into the animation, so frames land on both sides of the size render.
const RESIZE_DELAY_MS = 100;

const COLOR_OFF = '#00ffff';
const COLOR_ON = '#ff0000';
const SIZE_BIG = 200;
const SIZE_SMALL = 100;

function NonLayoutPropBox({
  colorToggled,
  size,
}: {
  colorToggled: boolean;
  size: number;
}) {
  const ref = useTestRef(BOX_REF);
  const sv = useSharedValue(colorToggled);

  useEffect(() => {
    sv.value = colorToggled;
  }, [colorToggled, sv]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(sv.value ? COLOR_ON : COLOR_OFF, {
        duration: 300,
      }),
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View
        ref={ref}
        style={[{ height: size, width: size }, animatedStyle]}
      />
    </View>
  );
}

// Mounts once and drives the whole sequence itself, so the recording sees a
// single view: the color toggle starts the animation and the size change is a
// React render that lands while it runs.
function NonLayoutPropSequence() {
  const [colorToggled, setColorToggled] = useState(false);
  const [size, setSize] = useState(SIZE_BIG);

  useEffect(() => {
    setColorToggled(true);
    const timeout = setTimeout(() => {
      setSize(SIZE_SMALL);
      notify(SEQUENCE_DONE);
    }, RESIZE_DELAY_MS);

    return () => clearTimeout(timeout);
  }, []);

  return <NonLayoutPropBox colorToggled={colorToggled} size={size} />;
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
  await expectEventually(() => box.getAnimatedStyle('backgroundColor')).toBe(
    color,
    ComparisonMode.COLOR
  );
}

// Native snapshots hold `#rrggbbaa` strings, while the JS side holds an ARGB
// number in some setups and the same string in others. Normalize both.
function toColorFrames(snapshot: SingleViewSnapshot): SingleViewSnapshot {
  return snapshot.map((update) => {
    const color = (update as { backgroundColor?: unknown }).backgroundColor;
    return {
      backgroundColor:
        typeof color === 'number' ? convertDecimalColor(color) : String(color),
    };
  });
}

function redChannel(frame: SingleViewSnapshot[number]): number {
  const color = (frame as { backgroundColor: string }).backgroundColor;
  return parseInt(color.slice(1, 3), 16);
}

async function expectBoxStaysSettled(size: number, color: string) {
  await expectBox(size, color);
  // One frame past the 300 ms animation - the window a stale frame can land in.
  await wait(320);
  const box = getTestComponent(BOX_REF);
  expect(await box.getAnimatedStyle('width')).toBe(size, ComparisonMode.PIXEL);
  expect(await box.getAnimatedStyle('backgroundColor')).toBe(
    color,
    ComparisonMode.COLOR
  );
}

describe('Animated non-layout prop and React render', () => {
  test('React render of layout props keeps the settled animated backgroundColor', async () => {
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

  test('React render during the on-to-off animation keeps both updates', async () => {
    await render(<NonLayoutPropBox colorToggled={false} size={SIZE_BIG} />);
    await expectBox(SIZE_BIG, COLOR_OFF);

    await render(<NonLayoutPropBox size={SIZE_BIG} colorToggled />);
    await expectBoxStaysSettled(SIZE_BIG, COLOR_ON);

    await render(<NonLayoutPropBox colorToggled={false} size={SIZE_BIG} />);
    await render(<NonLayoutPropBox colorToggled={false} size={SIZE_SMALL} />);
    await expectBoxStaysSettled(SIZE_SMALL, COLOR_OFF);
  });

  test('backgroundColor animates correctly after a React render changed the size', async () => {
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

  test('a React render neither drops nor reverts backgroundColor frames', async () => {
    await mockAnimationTimer();
    const updatesContainer = await recordAnimationUpdates();

    await render(<NonLayoutPropSequence />);
    await waitForAnimationUpdates(RECORDED_FRAMES);

    const frames = toColorFrames(await updatesContainer.getUpdates());
    const nativeFrames = toColorFrames(
      await updatesContainer.getNativeSnapshots()
    );
    await unmockAnimationTimer();

    expect(frames).toMatchNativeSnapshots(nativeFrames);

    // The color only ever moves towards COLOR_ON, so a stale value reapplied
    // by the size render would show up as a frame going backwards.
    const reds = frames.map(redChannel);
    for (let i = 1; i < reds.length; i++) {
      expect(reds[i]).toBeWithinRange(reds[i - 1], 255);
    }
    expect(reds[reds.length - 1] > reds[0]).toBe(true);

    await waitForNotification(SEQUENCE_DONE);
    await expectBox(SIZE_SMALL, COLOR_ON);
  });
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
