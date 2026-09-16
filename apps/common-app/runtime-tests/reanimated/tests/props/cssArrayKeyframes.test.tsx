import type { BoxShadowValue } from 'react-native';
import { View } from 'react-native';
import type {
  CSSAnimationKeyframes,
  CSSAnimationTimingFunction,
  CSSStyle,
} from 'react-native-reanimated';
import Animated, {
  linear,
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

async function shadows(name = 'animated'): Promise<Array<BoxShadowValue>> {
  await wait(100);
  return JSON.parse(
    await getTestComponent(name).getAnimatedStyle('boxShadow')
  ) as Array<BoxShadowValue>;
}

function TransformExample({ empty }: { empty: boolean }) {
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
            ...(empty ? { from: { transform: [] } } : {}),
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
  test.each([false, true])(
    'transform distinguishes an empty endpoint from an omitted one: %p',
    async (empty) => {
      await render(<TransformExample empty={empty} />);
      await expectEventually(() => getSharedValue('displacement'), 3000).toBe(
        empty ? -70 : -10
      );
    }
  );
  test.each([0, 0.5, 1])(
    'explicit empty keyframe at progress %p',
    async (progress) => {
      await render(
        <Example
          progress={progress}
          keyframes={{
            '25%': { boxShadow: [red] },
            '50%': { boxShadow: [] },
            '75%': { boxShadow: [blue] },
            from: { boxShadow: [] },
            to: { boxShadow: [] },
          }}
        />
      );
      expect(await shadows()).toBe([], ComparisonMode.ARRAY);
    }
  );

  test('empty to nonempty fades from a neutral shadow, not the base', async () => {
    await render(
      <Example
        keyframes={{ from: { boxShadow: [] }, to: { boxShadow: [red] } }}
      />
    );
    const result = await shadows();
    expect(result.length).toBe(1);
    expect(result[0].offsetX).toBe(5);
    expect(result[0].color).toBe('#ff000040');
  });

  test.each([false, true])(
    'implicit endpoint keeps the whole base: fromOnly=%p',
    async (fromOnly) => {
      await render(
        <Example
          progress={fromOnly ? 1 : 0}
          keyframes={
            fromOnly
              ? { from: { boxShadow: [green] } }
              : { to: { boxShadow: [green] } }
          }
        />
      );
      expect(await shadows()).toBe(
        await shadows('static'),
        ComparisonMode.ARRAY
      );
    }
  );

  test('extra underlying shadow fades instead of disappearing immediately', async () => {
    await render(<Example keyframes={{ to: { boxShadow: [green] } }} />);
    const result = await shadows();
    expect(result.length).toBe(2);
    expect(result[0].offsetX).toBe(25);
    expect(result[1].offsetX).toBe(-15);
    expect(result[1].color).toBe('#0000ffbf');
  });

  test('inset mismatch switches the entire list discretely', async () => {
    await render(
      <Example
        keyframes={{
          from: { boxShadow: base },
          to: { boxShadow: [green, { ...blue, inset: true }] },
        }}
      />
    );
    expect(await shadows()).toBe(await shadows('static'), ComparisonMode.ARRAY);
  });

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
  test.each([0.25, 0.75])(
    'unequal keyframe segments at %p keep only participating layers',
    async (progress) => {
      await render(
        <Example
          progress={progress}
          keyframes={{
            from: { boxShadow: [red, blue] },
            '50%': { boxShadow: [] },
            to: { boxShadow: [green] },
          }}
        />
      );
      const result = await shadows();
      expect(result.length).toBe(progress < 0.5 ? 2 : 1);
      expect(result[0].offsetX).toBe(progress < 0.5 ? 10 : 20);
    }
  );

  test('empty-to-empty keyframes render no shadows', async () => {
    await render(
      <Example keyframes={{ from: { boxShadow: [] }, to: { boxShadow: [] } }} />
    );
    expect(await shadows()).toBe([], ComparisonMode.ARRAY);
  });

  test('inset padding adopts the real shadow inset', async () => {
    await render(
      <Example
        keyframes={{
          from: { boxShadow: [] },
          to: { boxShadow: [{ ...red, inset: true }] },
        }}
      />
    );
    const result = await shadows();
    expect(result[0].inset).toBe(true);
    expect(result[0].offsetX).toBe(5);
  });

  test('inset mismatch switches all layers after halfway', async () => {
    const target = [green, { ...blue, inset: true }];
    await render(
      <Example
        progress={0.75}
        underlying={target}
        keyframes={{ from: { boxShadow: base }, to: { boxShadow: target } }}
      />
    );
    expect(await shadows()).toBe(await shadows('static'), ComparisonMode.ARRAY);
  });

  test('keyframe easing is applied once within its segment', async () => {
    await render(
      <Example
        progress={0.25}
        keyframes={{
          from: {
            boxShadow: [red],
            animationTimingFunction: steps(4, 'start'),
          },
          '50%': { boxShadow: [green] },
          to: { boxShadow: [] },
        }}
      />
    );
    expect((await shadows())[0].offsetX).toBe(35);
  });

  test.each([-0.5, 1.5])(
    'easing can extrapolate beyond endpoints: %p',
    async (output) => {
      await render(
        <Example
          progress={0.5}
          timingFunction={linear(0, [output, '50%'], 1)}
          keyframes={{ from: { boxShadow: [red] }, to: { boxShadow: [green] } }}
        />
      );
      expect((await shadows())[0].offsetX).toBe(20 + 20 * output);
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

  test('transition reversal to an empty list keeps shortening behavior', async () => {
    await render(<TransitionExample value={[]} duration={10000} />);
    await wait(100);
    await render(<TransitionExample value={[red]} duration={10000} />);
    expect((await shadows())[0].offsetX).toBe(5);
    await render(<TransitionExample value={[]} duration={10000} />);
    await wait(3500);
    expect(await shadows()).toBe([], ComparisonMode.ARRAY);
  });
  test('switching segments mid-animation shrinks and regrows the rendered list', async () => {
    const keyframes = {
      from: { boxShadow: base },
      '50%': { boxShadow: [] },
      to: { boxShadow: [green] },
    };
    await render(<Example progress={0.25} keyframes={keyframes} />);
    expect((await shadows()).length).toBe(2);
    await render(<Example progress={0.75} keyframes={keyframes} />);
    const shorter = await shadows();
    expect(shorter.length).toBe(1);
    expect(shorter[0].offsetX).toBe(20);
    await render(<Example progress={0.25} keyframes={keyframes} />);
    expect((await shadows()).length).toBe(2);
  });

  test('forwards fill keeps an explicit empty final list', async () => {
    await render(
      <Example
        finish
        fill="forwards"
        keyframes={{ from: { boxShadow: base }, to: { boxShadow: [] } }}
      />
    );
    await wait(500);
    expect(await shadows()).toBe([], ComparisonMode.ARRAY);
  });
});
