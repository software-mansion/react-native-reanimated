import type { ViewStyle } from 'react-native';
import { Platform, StyleSheet } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  getStaticFeatureFlag,
  makeMutable,
  useAnimatedStyle,
} from 'react-native-reanimated';

import {
  describe,
  expectEventually,
  getTestComponent,
  render,
  test,
  useTestRef,
  waitForFrames,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const BOX = 'box';

const styles = StyleSheet.create({
  box: { width: 100, height: 100 },
});

function OpacityBox({ opacity }: { opacity: SharedValue<number | null> }) {
  const ref = useTestRef(BOX);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get() as number,
  }));
  return <Animated.View ref={ref} style={[styles.box, animatedStyle]} />;
}

function BackgroundColorBox({
  backgroundColor,
}: {
  backgroundColor: SharedValue<string | null>;
}) {
  const ref = useTestRef(BOX);
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.get() as string,
  }));
  return <Animated.View ref={ref} style={[styles.box, animatedStyle]} />;
}

function TransformBox({
  transform,
}: {
  transform: SharedValue<ViewStyle['transform'] | null>;
}) {
  const ref = useTestRef(BOX);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: transform.get() as ViewStyle['transform'],
  }));
  return <Animated.View ref={ref} style={[styles.box, animatedStyle]} />;
}

function getMountedViewProps() {
  return getTestComponent(BOX).getMountedViewProps();
}

const synchronousPropsTest =
  Platform.OS === 'android' &&
  getStaticFeatureFlag('ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS') &&
  !getStaticFeatureFlag('USE_ANIMATION_BACKEND')
    ? test
    : test.skip;

// With the default React Native flags, a null that goes to the commit also resets the view. Only
// `enablePropsUpdateReconciliationAndroid` or `enableAccumulatedUpdatesInRawPropsAndroid` show the difference.
describe('Synchronous props set to null', () => {
  synchronousPropsTest('reset transform to the default', async () => {
    const transform = makeMutable<ViewStyle['transform'] | null>(null);
    await render(<TransformBox transform={transform} />);
    await waitForFrames();
    const component = getTestComponent(BOX);

    for (let cycle = 0; cycle < 2; cycle++) {
      transform.set([{ translateX: 25 }]);
      await expectEventually(
        async () => (await component.getTransformObservation())?.translateX
      ).toBe(25, ComparisonMode.FLOAT);

      transform.set(null);
      await expectEventually(
        async () => (await component.getTransformObservation())?.translateX
      ).toBe(0, ComparisonMode.FLOAT);
    }
  });

  synchronousPropsTest('reset opacity to the default', async () => {
    const opacity = makeMutable<number | null>(null);
    await render(<OpacityBox opacity={opacity} />);
    await waitForFrames();

    for (let cycle = 0; cycle < 2; cycle++) {
      opacity.set(0.5);
      await expectEventually(
        async () => (await getMountedViewProps())?.opacity
      ).toBe(0.5, ComparisonMode.FLOAT);

      opacity.set(null);
      await expectEventually(
        async () => (await getMountedViewProps())?.opacity
      ).toBe(1, ComparisonMode.FLOAT);
    }
  });

  synchronousPropsTest(
    'reset the background color to the default',
    async () => {
      const backgroundColor = makeMutable<string | null>(null);
      await render(<BackgroundColorBox backgroundColor={backgroundColor} />);
      await waitForFrames();

      for (let cycle = 0; cycle < 2; cycle++) {
        backgroundColor.set('red');
        await expectEventually(
          async () => (await getMountedViewProps())?.backgroundColor
        ).toBe('red', ComparisonMode.COLOR);

        backgroundColor.set(null);
        await expectEventually(
          async () => (await getMountedViewProps())?.backgroundColor
        ).toBe('transparent', ComparisonMode.COLOR);
      }
    }
  );
});
