import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Easing,
  makeMutable,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import {
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
  waitForFrames,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { runOnUIBlocking } from '../../../ReJest/utils/runOnUIBlocking';

const BOX_REF = 'nativeTransform';
const ANIMATION_DONE = 'nativeTranslationDone';
const TOLERANCE = 0.01;

function StaticTranslation({
  translated,
  customOrigin,
}: {
  translated: boolean;
  customOrigin: boolean;
}) {
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
          transform: customOrigin
            ? [{ scale: 2 }]
            : translated
              ? [{ translateX: 30 }, { translateY: -20 }]
              : undefined,
          transformOrigin: customOrigin ? '0% 0%' : undefined,
        }}
      />
    </View>
  );
}

function CssTranslation({ from }: { from?: 'empty' | 'none' }) {
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

describe('Native transform translation', () => {
  test.each([
    { translated: false, customOrigin: false },
    { translated: true, customOrigin: false },
    { translated: true, customOrigin: true },
  ])('reads translation: %p', async ({ translated, customOrigin }) => {
    await render(
      <StaticTranslation translated={translated} customOrigin={customOrigin} />
    );
    const box = getTestComponent(BOX_REF);
    const x = customOrigin ? 40 : translated ? 30 : 0;
    const y = customOrigin ? 40 : translated ? -20 : 0;
    await expectEventually(
      async () => (await box.getMountedViewProps())?.transformTranslateX
    ).toBeWithinRange(x - TOLERANCE, x + TOLERANCE);
    await expectEventually(
      async () => (await box.getMountedViewProps())?.transformTranslateY
    ).toBeWithinRange(y - TOLERANCE, y + TOLERANCE);
    const mounted = await box.getMountedViewProps();
    expect(mounted?.x).toBe(13, ComparisonMode.PIXEL);
    expect(mounted?.y).toBe(17, ComparisonMode.PIXEL);
    expect(mounted?.width).toBe(80, ComparisonMode.PIXEL);
    expect(mounted?.height).toBe(80, ComparisonMode.PIXEL);
  });

  test.each([undefined, 'empty', 'none'] as const)(
    'reads transform-only paused CSS keyframes: %p',
    async (from) => {
      await render(<CssTranslation from={from} />);
      const box = getTestComponent(BOX_REF);
      const expected = from ? 10 : 70;
      await expectEventually(
        async () => (await box.getMountedViewProps())?.transformTranslateX
      ).toBeWithinRange(expected - TOLERANCE, expected + TOLERANCE);
      await expectEventually(
        async () => (await box.getPresentedViewProps())?.transformTranslateX
      ).toBeWithinRange(expected - TOLERANCE, expected + TOLERANCE);
    }
  );

  test('reads shared-value translation during and after animation', async () => {
    const value = makeMutable(0);
    await mockAnimationTimer();
    try {
      await render(<SharedTranslation value={value} />);
      const box = getTestComponent(BOX_REF);
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
      await waitForFrames(12);
      expect(
        (await box.getMountedViewProps())?.transformTranslateX
      ).toBeWithinRange(10, 90);
      expect(
        (await box.getPresentedViewProps())?.transformTranslateX
      ).toBeWithinRange(10, 90);
      await waitForNotification(ANIMATION_DONE, 60000);
      await expectEventually(
        async () => (await box.getMountedViewProps())?.transformTranslateX
      ).toBeWithinRange(100 - TOLERANCE, 100 + TOLERANCE);
      await expectEventually(
        async () => (await box.getMountedViewProps())?.transformTranslateY
      ).toBeWithinRange(-50 - TOLERANCE, -50 + TOLERANCE);
    } finally {
      await unmockAnimationTimer();
    }
  });
});
