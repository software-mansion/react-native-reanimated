import type { BoxShadowValue } from 'react-native';
import { View } from 'react-native';
import type {
  CSSAnimationKeyframes,
  CSSAnimationTimingFunction,
  CSSStyle,
} from 'react-native-reanimated';
import Animated, {
  measure,
  steps,
  useAnimatedRef,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  expectEventually,
  getSharedValue,
  getTestComponent,
  registerValue,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';

const red = { blurRadius: 4, color: 'red', offsetX: 20, offsetY: 8 };
const blue = { ...red, color: 'blue', offsetX: -20 };
const green = { ...red, color: 'green', offsetX: 40 };
const base = [red, blue];

function Example({
  finish = false,
  keyframes,
  progress = 0.25,
  underlying = base,
  timingFunction = 'linear',
  fill = 'none',
}: {
  keyframes: CSSAnimationKeyframes;
  progress?: number;
  underlying?: Array<BoxShadowValue>;
  finish?: boolean;
  fill?: 'none' | 'forwards';
  timingFunction?: CSSAnimationTimingFunction;
}) {
  const animatedRef = useTestRef('animated');
  const staticRef = useTestRef('static');
  return (
    <View>
      <Animated.View
        ref={animatedRef}
        style={{
          animationDelay: finish ? 0 : -progress * 1000,
          animationDuration: finish ? 100 : 1000,
          animationFillMode: finish ? fill : 'both',
          animationName: keyframes,
          animationPlayState: finish ? 'running' : 'paused',
          animationTimingFunction: timingFunction,
          backgroundColor: 'white',
          boxShadow: underlying,
          height: 80,
          width: 80,
        }}
      />
      <Animated.View
        ref={staticRef}
        style={{ boxShadow: underlying, height: 80, width: 80 }}
      />
    </View>
  );
}

// Views with the same inline keyframes share one registry entry and the
// interpolator behind it, so each frame resolves the omitted endpoint against
// a different underlying list.

async function shadows(name = 'animated'): Promise<Array<BoxShadowValue>> {
  await wait(100);
  return JSON.parse(
    await getTestComponent(name).getAnimatedStyle('boxShadow')
  ) as Array<BoxShadowValue>;
}

function TransformExample({ from }: { from?: 'none' | 'empty' }) {
  const animatedRef = useAnimatedRef();
  const staticRef = useAnimatedRef();
  const displacement = useSharedValue<number | null>(null);
  registerValue('displacement', displacement);
  useFrameCallback(() => {
    const animated = measure(animatedRef);
    const reference = measure(staticRef);
    if (animated && reference) {
      displacement.value = animated.pageX - reference.pageX;
    }
  });
  return (
    <View>
      <Animated.View
        ref={animatedRef}
        style={{
          animationDelay: -250,
          animationDuration: 1000,
          animationFillMode: 'both',
          animationName: {
            ...(from === 'none' ? { from: { transform: 'none' } } : {}),
            ...(from === 'empty' ? { from: { transform: [] } } : {}),
            to: { transform: [{ translateX: 40 }] },
          },
          animationPlayState: 'paused',
          animationTimingFunction: 'linear',
          height: 80,
          transform: [{ translateX: 80 }],
          width: 80,
        }}
      />
      <Animated.View
        ref={staticRef}
        style={{ height: 80, transform: [{ translateX: 80 }], width: 80 }}
      />
    </View>
  );
}

function OriginExample({
  keyframes,
  underlying,
  finish = false,
}: {
  keyframes: CSSAnimationKeyframes;
  underlying?: CSSStyle['transformOrigin'];
  finish?: boolean;
}) {
  const animatedRef = useAnimatedRef();
  const staticRef = useAnimatedRef();
  const displacement = useSharedValue<number | null>(null);
  registerValue('originDisplacement', displacement);
  useFrameCallback(() => {
    const animated = measure(animatedRef);
    const reference = measure(staticRef);
    if (animated && reference) {
      displacement.value = animated.pageX - reference.pageX;
    }
  });
  const style = {
    width: 80,
    height: 80,
    transform: [{ scale: 2 }],
    transformOrigin: underlying,
  };
  return (
    <View>
      <Animated.View
        ref={animatedRef}
        style={{
          ...style,
          animationName: keyframes,
          animationDuration: finish ? 100 : 1000,
          animationDelay: finish ? 0 : -250,
          animationPlayState: finish ? 'running' : 'paused',
          animationFillMode: finish ? 'none' : 'both',
          animationTimingFunction: 'linear',
        }}
      />
      <Animated.View ref={staticRef} style={style} />
    </View>
  );
}

function TransitionExample({
  value,
  duration = 1000000,
}: {
  value?: Array<BoxShadowValue>;
  duration?: number;
}) {
  const ref = useTestRef('animated');
  return (
    <Animated.View
      ref={ref}
      style={{
        boxShadow: value,
        width: 80,
        height: 80,
        transitionProperty: 'boxShadow',
        // Transitions cannot be paused. The negative delay starts at progress
        // 0.25 and steps(4, 'end') holds that value until half the duration.
        transitionDuration: duration,
        transitionDelay: -duration / 4,
        transitionTimingFunction: steps(4, 'end'),
      }}
    />
  );
}

describe('CSS array keyframes', () => {
  test.each([undefined, 'empty', 'none'] as const)(
    'transform keyframe start: %p',
    async (from) => {
      await render(<TransformExample from={from} />);
      // An omitted start keeps the view's own translateX 80, an explicit
      // empty list or none starts from the identity transform.
      await expectEventually(() => getSharedValue('displacement'), 3000).toBe(
        from ? -70 : -10
      );
    }
  );

  test.each([base, []])(
    'natural completion restores the whole underlying list: %p',
    async (underlying) => {
      await render(
        <Example
          keyframes={{ from: { boxShadow: [red] }, to: { boxShadow: [green] } }}
          underlying={underlying}
          finish
        />
      );
      await wait(500);
      expect(await shadows()).toBe(
        await shadows('static'),
        ComparisonMode.ARRAY
      );
    }
  );

  test.each([
    { underlying: '25% 50%', from: '10px 50%', to: '100% 50%', expected: -7.5 },
    { underlying: '25% 50%', from: undefined, to: '100% 50%', expected: -15 },
    { underlying: undefined, from: undefined, to: '0% 50%', expected: 10 },
  ])(
    'transformOrigin keeps tuple defaults and mixed units: %p',
    async ({ underlying, from, to, expected }) => {
      await render(
        <OriginExample
          underlying={underlying}
          keyframes={{
            ...(from ? { from: { transformOrigin: from } } : {}),
            to: { transformOrigin: to },
          }}
        />
      );
      await expectEventually(
        () => getSharedValue('originDisplacement'),
        3000
      ).toBe(expected);
    }
  );

  test.each([undefined, '25% 50%'])(
    'transformOrigin restores underlying/default tuple: %p',
    async (underlying) => {
      await render(
        <OriginExample
          underlying={underlying}
          finish
          keyframes={{
            from: { transformOrigin: '0% 50%' },
            to: { transformOrigin: '100% 50%' },
          }}
        />
      );
      await wait(500);
      await expectEventually(
        () => getSharedValue('originDisplacement'),
        3000
      ).toBe(0);
    }
  );

  test.each([false, true])(
    'transitions pad unequal lists: shrinking=%p',
    async (shrinking) => {
      await render(<TransitionExample value={shrinking ? base : []} />);
      await wait(100);
      await render(<TransitionExample value={shrinking ? [] : base} />);
      const result = await shadows();
      expect(result.length).toBe(2);
      expect(result[0].offsetX).toBe(shrinking ? 15 : 5);
      expect(result[1].offsetX).toBe(shrinking ? -15 : -5);
    }
  );
});
