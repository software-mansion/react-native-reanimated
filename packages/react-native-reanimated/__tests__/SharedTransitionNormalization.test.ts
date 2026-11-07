import { withDelay, withSpring, withTiming } from '../src/animation';
import type { AnimationObject } from '../src/commonTypes';
import { ReduceMotion } from '../src/commonTypes';
import { Easing } from '../src/Easing';
import {
  getSharedTransitionGeometry,
  SharedTransition,
} from '../src/layoutReanimation/SharedTransition';

jest.mock('react-native-worklets', () =>
  jest.requireActual('../../react-native-worklets/src/mock')
);

describe('fresh shared transition geometry clocks', () => {
  const configs = [
    {
      name: 'physics',
      spring: { damping: 15, mass: 1, stiffness: 100 },
      transition: () =>
        SharedTransition.springify().damping(15).mass(1).stiffness(100),
    },
    {
      name: 'duration',
      spring: { duration: 600, dampingRatio: 0.85 },
      transition: () => SharedTransition.springify(600).dampingRatio(0.85),
    },
    {
      name: 'clamped',
      spring: { damping: 15, mass: 1, stiffness: 100, overshootClamping: true },
      transition: () =>
        SharedTransition.springify()
          .damping(15)
          .mass(1)
          .stiffness(100)
          .overshootClamping(true),
    },
    {
      name: 'reduced motion',
      spring: {
        duration: 600,
        dampingRatio: 0.85,
        reduceMotion: ReduceMotion.Always,
      },
      transition: () =>
        SharedTransition.springify(600)
          .dampingRatio(0.85)
          .reduceMotion(ReduceMotion.Always),
    },
  ];

  describe.each(configs)('$name', ({ spring, transition }) => {
    test.each([-1000, -0.001, 0.001, 1000])(
      'matches position and completion over distance %p',
      (distance) => {
        const scalar = resolveAnimation(withSpring(distance, spring));
        const progress = geometryClock(transition(), distance);
        scalar.onStart(scalar, 0, 0, undefined!);
        progress.onStart(progress, 0, 0, undefined!);
        for (let time = 16; time < 5000; time += 16) {
          const scalarFinished = scalar.onFrame(scalar, time);
          const progressFinished = progress.onFrame(progress, time);
          expect(scalar.current).toBeCloseTo(
            (progress.current as number) * distance,
            8
          );
          expect(scalarFinished).toBe(progressFinished);
          if (scalarFinished) {
            return;
          }
        }
        throw new Error('[Reanimated] The spring did not finish.');
      }
    );
  });

  test.each([-1000, -0.001, 0.001, 1000])(
    'matches eased timing over distance %p',
    (distance) => {
      const config = { duration: 600, easing: Easing.inOut(Easing.cubic) };
      const scalar = resolveAnimation(withTiming(distance, config));
      const progress = geometryClock(
        SharedTransition.duration(600).easing(config.easing),
        distance
      );
      scalar.onStart(scalar, 0, 0, undefined!);
      progress.onStart(progress, 0, 0, undefined!);
      for (let time = 16; time < 1000; time += 16) {
        const scalarFinished = scalar.onFrame(scalar, time);
        const progressFinished = progress.onFrame(progress, time);
        expect(scalar.current).toBeCloseTo(
          (progress.current as number) * distance,
          8
        );
        expect(scalarFinished).toBe(progressFinished);
        if (scalarFinished) {
          return;
        }
      }
      throw new Error('[Reanimated] The timing animation did not finish.');
    }
  );

  test('keeps the completion rule of a fade-only spring', () => {
    const config = { damping: 5, mass: 1, stiffness: 100 };
    const style = SharedTransition.springify()
      .damping(config.damping)
      .mass(config.mass)
      .stiffness(config.stiffness)
      .fadeContent()
      .build()({
      currentOriginX: 10,
      targetOriginX: 10,
      currentContentOpacity: 1,
      targetContentOpacity: 0,
    } as never);
    expect(style.initialValues.sharedTransitionGeometryProgress).toBe(1);
    expect(style.animations.sharedTransitionGeometryProgress).toBe(1);
    const fade = resolveAnimation(style.animations.contentOpacity);
    const previous = resolveAnimation(
      withSpring(0, {
        ...config,
        overshootClamping: true,
      })
    );
    fade.onStart(fade, 1, 0, undefined!);
    previous.onStart(previous, 1, 0, undefined!);
    let finished = false;
    for (let time = 16; time < 1000; time += 16) {
      finished = fade.onFrame(fade, time);
      expect(finished).toBe(previous.onFrame(previous, time));
      expect(fade.current).toBe(previous.current);
      if (finished) {
        break;
      }
    }
    expect(finished).toBe(true);
  });

  test('keeps the delay before a fresh geometry clock starts', () => {
    const scalar = resolveAnimation(
      withDelay(120, withTiming(100, { duration: 600, easing: Easing.linear }))
    );
    const progress = geometryClock(
      SharedTransition.duration(600).easing(Easing.linear).delay(120),
      100
    );
    scalar.onStart(scalar, 0, 0, undefined!);
    progress.onStart(progress, 0, 0, undefined!);
    for (let time = 16; time < 1000; time += 16) {
      const finished = scalar.onFrame(scalar, time);
      expect(progress.onFrame(progress, time)).toBe(finished);
      expect(scalar.current).toBeCloseTo((progress.current as number) * 100, 8);
      if (finished) return;
    }
    throw new Error('[Reanimated] The delayed geometry clock did not finish.');
  });

  test.each(configs.slice(0, 2))(
    'matches a $name spring on a 3D transform',
    ({ spring, transition }) => {
      const source = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
      const target = [
        Math.cos(0.5),
        0,
        -Math.sin(0.5),
        0,
        0,
        1.2,
        0,
        0,
        Math.sin(0.5),
        0,
        Math.cos(0.5),
        -0.002,
        20,
        30,
        0,
        1,
      ];
      const builder = transition();
      const values = {
        currentTransform: { matrix: source },
        targetTransform: { matrix: target },
      } as never;
      const scalar = resolveAnimation(withSpring(target, spring));
      const progress = resolveAnimation(
        builder.build()(values).animations.sharedTransitionGeometryProgress
      );
      scalar.onStart(scalar, source, 0, undefined!);
      progress.onStart(progress, 0, 0, undefined!);
      for (let time = 16; time < 5000; time += 16) {
        const finished = scalar.onFrame(scalar, time);
        expect(progress.onFrame(progress, time)).toBe(finished);
        const matrix = (
          getSharedTransitionGeometry(values, progress.current as number)
            .transform as [{ matrix: number[] }]
        )[0].matrix;
        matrix.forEach((value, index) => {
          expect(value).toBeCloseTo((scalar.current as number[])[index], 8);
        });
        if (finished) return;
      }
      throw new Error('[Reanimated] The transform spring did not finish.');
    }
  );
});

function geometryClock(transition: SharedTransition, distance: number) {
  const style = transition.build()({
    currentOriginX: 0,
    targetOriginX: distance,
  } as never);
  return resolveAnimation(style.animations.sharedTransitionGeometryProgress);
}

function resolveAnimation(value: unknown): AnimationObject {
  return (typeof value === 'function' ? value() : value) as AnimationObject;
}
