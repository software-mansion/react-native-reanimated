import { Easing, ReduceMotion, withSpring, withTiming } from '../src';
import type { AnimationObject } from '../src/commonTypes';

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const ZERO_SCALE = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 30, 40, 0, 1];
const SINGULAR = [1, 2, 3, 0, 2, 4, 6, 0, 0, 0, 1, 0, 30, 40, 0, 1];

const drivers = [
  [
    'withTiming',
    (to: number[]) =>
      withTiming(to, {
        duration: 100,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }),
  ],
  [
    'withSpring',
    (to: number[]) => withSpring(to, { reduceMotion: ReduceMotion.Never }),
  ],
] as const;

describe.each(drivers)('%s transform matrices', (_name, createAnimation) => {
  test.each([[ZERO_SCALE], [SINGULAR]])(
    'animates to and from a singular matrix %#',
    (matrix) => {
      for (const [from, to] of [
        [IDENTITY, matrix],
        [matrix, IDENTITY],
      ]) {
        const animation = createAnimation(to) as unknown as AnimationObject;
        animation.onStart(animation, from, 1000, undefined);
        let finished = false;
        for (let time = 1016; time <= 11000 && !finished; time += 16) {
          finished = animation.onFrame(animation, time);
          expect((animation.current as number[]).every(Number.isFinite)).toBe(
            true
          );
        }
        expect(finished).toBe(true);
        expect(animation.current).toEqual(to);
      }
    }
  );

  test('can restart from a partially collapsed matrix', () => {
    const first = createAnimation(ZERO_SCALE) as unknown as AnimationObject;
    first.onStart(first, IDENTITY, 1000, undefined);
    first.onFrame(first, 1016);
    first.onFrame(first, 1048);
    const next = createAnimation(IDENTITY) as unknown as AnimationObject;
    next.onStart(next, first.current, 1048, first);
    let finished = false;
    for (let time = 1064; time <= 11000 && !finished; time += 16) {
      finished = next.onFrame(next, time);
      expect((next.current as number[]).every(Number.isFinite)).toBe(true);
    }
    expect(finished).toBe(true);
    expect(next.current).toEqual(IDENTITY);
  });
});
