import { Easing, ReduceMotion, withDelay, withTiming } from '../src';
import type { AnimationObject } from '../src/commonTypes';
import { ReducedMotionManager } from '../src/ReducedMotion';

jest.mock('../src/featureFlags', () => ({
  ...jest.requireActual('../src/featureFlags'),
  getStaticFeatureFlag: (name: string) =>
    name === 'IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION',
}));

const describe_ = (animation: unknown) =>
  (animation as AnimationObject).__nativeTiming;

function onUIRuntime<T>(create: () => T): T {
  const runtimeKind = globalThis.__RUNTIME_KIND;
  globalThis.__RUNTIME_KIND = 2;
  try {
    return create();
  } finally {
    globalThis.__RUNTIME_KIND = runtimeKind;
  }
}

describe('native timing description', () => {
  test('a linear timing has no control points', () => {
    const animation = onUIRuntime(() =>
      withTiming(10, { duration: 200, easing: Easing.linear })
    );
    expect(describe_(animation)).toEqual({
      toValue: 10,
      durationMs: 200,
      delaysMs: [],
    });
  });

  test.each([
    ['Easing.ease', Easing.ease, [0.42, 0, 1, 1]],
    ['Easing.in(Easing.ease)', Easing.in(Easing.ease), [0.42, 0, 1, 1]],
    ['Easing.bezier', Easing.bezier(0.1, 0.2, 0.3, 0.4), [0.1, 0.2, 0.3, 0.4]],
  ])('%s gives its control points', (_, easing, cubicBezier) => {
    const animation = onUIRuntime(() => withTiming(10, { easing }));
    expect(describe_(animation)).toEqual({
      toValue: 10,
      durationMs: 300,
      delaysMs: [],
      cubicBezier,
    });
  });

  test.each([
    ['the default easing', () => withTiming(10)],
    [
      'Easing.out(Easing.ease)',
      () => withTiming(10, { easing: Easing.out(Easing.ease) }),
    ],
    [
      'Easing.bezierFn',
      () => withTiming(10, { easing: Easing.bezierFn(0.1, 0.2, 0.3, 0.4) }),
    ],
    ['a callback', () => withTiming(10, { easing: Easing.linear }, jest.fn())],
    [
      'a target that is not a number',
      () => withTiming('10%', { easing: Easing.linear }),
    ],
    [
      'reduced motion',
      () =>
        withTiming(10, {
          easing: Easing.linear,
          reduceMotion: ReduceMotion.Always,
        }),
    ],
    [
      'a delay with reduced motion',
      () =>
        withDelay(
          5,
          withTiming(10, { easing: Easing.linear }),
          ReduceMotion.Always
        ),
    ],
    [
      'a delay of an animation with no description',
      () => withDelay(5, withTiming(10)),
    ],
  ])('%s has no description', (_, create) => {
    expect(describe_(onUIRuntime(create))).toBeUndefined();
    expect('__nativeTiming' in (onUIRuntime(create) as object)).toBe(false);
  });

  test('each delay wrapper adds no less than zero', () => {
    const timing = () =>
      withTiming(10, { duration: 200, easing: Easing.linear });
    expect(
      describe_(onUIRuntime(() => withDelay(-300, withDelay(200, timing()))))
        ?.delaysMs
    ).toEqual([0, 200]);
    expect(
      describe_(onUIRuntime(() => withDelay(100, withDelay(200, timing()))))
        ?.delaysMs
    ).toEqual([100, 200]);
  });

  test('the system reduced motion setting gives no description', () => {
    const isReduceMotionOnUI = ReducedMotionManager.uiValue;
    const wasReduced = isReduceMotionOnUI.value;
    isReduceMotionOnUI.value = true;
    try {
      const create = () => withTiming(10, { easing: Easing.linear });
      expect(describe_(onUIRuntime(create))).toBeUndefined();
    } finally {
      isReduceMotionOnUI.value = wasReduced;
    }
  });
});
