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
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

// Mirrors the NonLayoutPropAndRenderExample screen: backgroundColor is animated
// from a shared value on the UI runtime, while width and height come from
// React. A React render that changes only the layout props must not reset the
// animated backgroundColor to a stale value.

const BOX_REF = 'NON_LAYOUT_PROP_BOX';
const ANIMATION_DURATION_MS = 300;
// About 20 frames, enough for a React commit and a possible stale animation
// frame to land. `waitForFrames(n > 1)` is not used because of a ReJest bug:
// its nested worklet captures itself before it is assigned.
const SETTLE_DELAY_MS = 20 * 16;

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
        duration: ANIMATION_DURATION_MS,
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

async function expectBoxStaysSettled(size: number, color: string) {
  await expectBox(size, color);
  await wait(SETTLE_DELAY_MS);
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
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
