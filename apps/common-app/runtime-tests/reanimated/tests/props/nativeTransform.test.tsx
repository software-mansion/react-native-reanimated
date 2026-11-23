import type { TransformsStyle } from 'react-native';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Easing,
  makeMutable,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import RuntimeTestObserver from '../../../ReJest/native/NativeRuntimeTestObserver';
import {
  advanceAnimationTimer,
  describe,
  expect,
  expectEventually,
  getTestComponent,
  mockAnimationTimer,
  notify,
  render,
  test,
  unmockAnimationTimer,
  useTestRef,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const BOX_REF = 'nativeTransform';
const ANIMATION_DONE = 'nativeTranslationDone';

function StaticTranslation({
  transform,
  transformOrigin,
}: Pick<TransformsStyle, 'transform' | 'transformOrigin'>) {
  const ref = useTestRef(BOX_REF);
  return (
    <View collapsable={false} style={{ width: 200, height: 200 }}>
      <Animated.View
        ref={ref}
        style={{
          position: 'absolute',
          left: 13,
          top: 17,
          width: 80,
          height: 80,
          transform,
          transformOrigin,
        }}
      />
    </View>
  );
}

function CssTranslation({ from }: { from: 'unset' | 'empty' | 'none' }) {
  const ref = useTestRef(BOX_REF);
  return (
    <Animated.View
      ref={ref}
      style={{
        width: 80,
        height: 80,
        transform: [{ translateX: 80 }],
        animationName: {
          ...(from === 'none' ? { from: { transform: 'none' } } : {}),
          ...(from === 'empty' ? { from: { transform: [] } } : {}),
          to: { transform: [{ translateX: 40 }] },
        },
        animationDuration: 1000,
        animationDelay: -250,
        animationPlayState: 'paused',
        animationFillMode: 'both',
        animationTimingFunction: 'linear',
      }}
    />
  );
}

function SharedTranslation({ value }: { value: SharedValue<number> }) {
  const ref = useTestRef(BOX_REF);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: value.value }, { translateY: -value.value / 2 }],
  }));
  return <Animated.View ref={ref} style={[{ width: 80, height: 80 }, style]} />;
}

async function expectTranslation(x: number, y: number) {
  const box = getTestComponent(BOX_REF);
  await expectEventually(
    async () => (await box.getTransformObservation())?.matrix[12]
  ).toBe(x, ComparisonMode.PIXEL);
  await expectEventually(
    async () => (await box.getTransformObservation())?.matrix[13]
  ).toBe(y, ComparisonMode.PIXEL);
}

const nativeTest = RuntimeTestObserver ? test : test.skip;

describe('Native transform translation', () => {
  nativeTest.each([
    { name: 'none', x: 0, y: 0 },
    {
      name: 'translation',
      transform: [{ translateX: 30 }, { translateY: -20 }],
      x: 30,
      y: -20,
    },
    {
      name: 'translation and scale about a custom origin',
      transform: [{ translateX: 30 }, { scale: 2 }],
      transformOrigin: '0% 0%',
      x: 70,
      y: 40,
    },
  ])(
    'reads translation: ${name}',
    async ({ transform, transformOrigin, x, y }) => {
      await render(
        <StaticTranslation
          transform={transform}
          transformOrigin={transformOrigin}
        />
      );
      await expectTranslation(x, y);
      const mounted = await getTestComponent(BOX_REF).getMountedViewProps();
      expect(mounted?.x).toBe(13, ComparisonMode.PIXEL);
      expect(mounted?.y).toBe(17, ComparisonMode.PIXEL);
      expect(mounted?.width).toBe(80, ComparisonMode.PIXEL);
      expect(mounted?.height).toBe(80, ComparisonMode.PIXEL);
    }
  );

  nativeTest.each(['unset', 'empty', 'none'] as const)(
    'reads transform-only paused CSS keyframes: %s',
    async (from) => {
      await render(<CssTranslation from={from} />);
      await expectTranslation(from === 'unset' ? 70 : 10, 0);
    }
  );

  nativeTest(
    'reads shared-value translation during and after animation',
    async () => {
      const value = makeMutable(0);
      await mockAnimationTimer({ autoAdvance: false });
      try {
        await render(<SharedTranslation value={value} />);
        await runOnUIBlocking(() => {
          'worklet';
          value.value = withTiming(
            100,
            { duration: 1000, easing: Easing.linear },
            (finished) => {
              if (finished) {
                notify(ANIMATION_DONE);
              }
            }
          );
        });
        await advanceAnimationTimer(200);
        await expectTranslation(20, -10);
        await advanceAnimationTimer(800);
        await waitForNotification(ANIMATION_DONE);
        await expectTranslation(100, -50);
      } finally {
        await unmockAnimationTimer();
      }
    }
  );
});
