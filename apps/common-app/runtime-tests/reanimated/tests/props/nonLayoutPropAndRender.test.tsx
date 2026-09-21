import { useEffect } from 'react';
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
  recordAnimationUpdates,
  render,
  test,
  unmockAnimationTimer,
  useTestRef,
  wait,
  waitForAnimationUpdates,
} from '../../../ReJest/RuntimeTestsApi';
import type { SingleViewSnapshot } from '../../../ReJest/TestRunner/UpdatesContainer';
import { ComparisonMode } from '../../../ReJest/types';
import { convertDecimalColor } from '../../../ReJest/utils/util';

const BOX_REF = 'NON_LAYOUT_PROP_BOX';
// Under the ~19 frames of the 300 ms animation; asking for more times out.
const RECORDED_FRAMES = 12;

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

function colorOf(update: SingleViewSnapshot[number]): string {
  return convertDecimalColor(
    (update as { backgroundColor?: unknown }).backgroundColor
  );
}

function toColorFrames(snapshot: SingleViewSnapshot): SingleViewSnapshot {
  return snapshot.map((update) => ({ backgroundColor: colorOf(update) }));
}

function redChannel(frame: SingleViewSnapshot[number]): number {
  return parseInt(colorOf(frame).slice(1, 3), 16);
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

  test('React render during the backgroundColor animation keeps both updates', async () => {
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

  // Frame-level counterpart of the mid-animation test above, on a mocked clock.
  test('a React render neither drops nor reverts backgroundColor frames', async () => {
    await mockAnimationTimer();
    const updatesContainer = await recordAnimationUpdates();

    await render(<NonLayoutPropBox colorToggled={false} size={SIZE_BIG} />);
    await render(<NonLayoutPropBox size={SIZE_BIG} colorToggled />);
    await render(<NonLayoutPropBox size={SIZE_SMALL} colorToggled />);
    await waitForAnimationUpdates(RECORDED_FRAMES);

    const frames = toColorFrames(
      await updatesContainer.getUpdates(undefined, ['backgroundColor'])
    );
    const nativeFrames = toColorFrames(
      await updatesContainer.getNativeSnapshots(undefined, ['backgroundColor'])
    );
    await unmockAnimationTimer();

    expect(frames).toMatchNativeSnapshots(nativeFrames);

    const reds = frames.map(redChannel);
    for (let i = 1; i < reds.length; i++) {
      expect(reds[i]).toBeWithinRange(reds[i - 1], 255);
    }
    expect(reds[reds.length - 1] > reds[0]).toBe(true);

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
