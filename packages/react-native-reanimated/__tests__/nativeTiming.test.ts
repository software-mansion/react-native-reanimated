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

const timingPhase = (
  toValue: number | string,
  durationMs: number,
  easing: unknown = { kind: 'linear' }
) => ({ kind: 'timing', durationMs, toValue, easing });

const easingOf = (animation: unknown) => {
  const phases = describe_(animation)!.phases;
  const lastPhase = phases[phases.length - 1];
  return lastPhase.kind === 'timing' ? lastPhase.easing : undefined;
};

describe('native timing description', () => {
  test('a linear timing is one linear phase', () => {
    const animation = onUIRuntime(() =>
      withTiming(10, { duration: 200, easing: Easing.linear })
    );
    expect(describe_(animation)).toEqual({ phases: [timingPhase(10, 200)] });
  });

  test('a number with a unit keeps its unit', () => {
    const animation = onUIRuntime(() =>
      withTiming('90deg', { duration: 200, easing: Easing.linear })
    );
    expect(describe_(animation)).toEqual({
      phases: [timingPhase('90deg', 200)],
    });
  });

  test.each([
    ['Easing.ease', Easing.ease, [0.42, 0, 1, 1]],
    ['Easing.in(Easing.ease)', Easing.in(Easing.ease), [0.42, 0, 1, 1]],
    ['Easing.bezier', Easing.bezier(0.1, 0.2, 0.3, 0.4), [0.1, 0.2, 0.3, 0.4]],
  ])('%s gives its control points', (_, easing, controlPoints) => {
    const animation = onUIRuntime(() => withTiming(10, { easing }));
    expect(describe_(animation)).toEqual({
      phases: [timingPhase(10, 300, { kind: 'cubicBezier', controlPoints })],
    });
  });

  test.each([
    ['Easing.out(Easing.ease)', Easing.out(Easing.ease)],
    ['Easing.bezierFn', Easing.bezierFn(0.1, 0.2, 0.3, 0.4)],
    ['Easing.bounce', Easing.bounce],
  ])('%s gives the easing function', (_, easing) => {
    const animation = onUIRuntime(() => withTiming(10, { easing }));
    expect(describe_(animation)).toEqual({
      phases: [timingPhase(10, 300, { kind: 'function', easing })],
    });
  });

  test('a factory with no control points gives the function that it makes', () => {
    const made = (time: number) => time * time;
    const animation = onUIRuntime(() =>
      withTiming(10, { easing: { factory: () => made } })
    );
    expect(easingOf(animation)).toEqual({ kind: 'function', easing: made });
  });

  test('each timing with the default easing has the same function', () => {
    const first = easingOf(onUIRuntime(() => withTiming(10)));
    const second = easingOf(onUIRuntime(() => withTiming(20)));
    expect(first).toEqual({ kind: 'function', easing: expect.any(Function) });
    expect(first).toEqual(second);
    const curve = (first as { easing: (time: number) => number }).easing;
    expect([0.25, 0.5, 0.75].map(curve)).toEqual(
      [0.25, 0.5, 0.75].map(Easing.inOut(Easing.quad))
    );
  });

  test.each([
    ['a callback', () => withTiming(10, { easing: Easing.linear }, jest.fn())],
    [
      'a target that is not a number or a string',
      () => withTiming([10, 20], { easing: Easing.linear }),
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
      () => withDelay(5, withTiming(10, {}, jest.fn())),
    ],
  ])('%s has no description', (_, create) => {
    expect(describe_(onUIRuntime(create))).toBeUndefined();
    expect('__nativeTiming' in (onUIRuntime(create) as object)).toBe(false);
  });

  test('each delay wrapper is one hold phase of no less than zero', () => {
    const timing = () =>
      withTiming(10, { duration: 200, easing: Easing.linear });
    const hold = (durationMs: number) => ({ kind: 'hold', durationMs });
    expect(
      describe_(onUIRuntime(() => withDelay(-300, withDelay(200, timing()))))
    ).toEqual({ phases: [hold(0), hold(200), timingPhase(10, 200)] });
    expect(
      describe_(onUIRuntime(() => withDelay(100, withDelay(200, timing()))))
    ).toEqual({ phases: [hold(100), hold(200), timingPhase(10, 200)] });
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
