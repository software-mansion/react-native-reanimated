import { ReduceMotion, withSpring } from '../src';
import type { SpringAnimation } from '../src';

const START = 1_000;

function startSpring(
  toValue: number,
  from: number,
  now = START,
  config: { damping?: number; mass?: number; stiffness?: number } = {
    damping: 20,
    mass: 0.3,
    stiffness: 200,
  }
): SpringAnimation {
  const animation = withSpring(toValue, {
    ...config,
    reduceMotion: ReduceMotion.Never,
  }) as unknown as SpringAnimation;
  animation.onStart(animation, from, now, null);
  return animation;
}

describe('withSpring', () => {
  describe('frame earlier than start stamp', () => {
    test('holds the start value on a first frame before startTimestamp', () => {
      const animation = startSpring(1, 0);
      const finished = animation.onFrame(animation, START - 5);

      expect(finished).toBe(false);
      expect(animation.current).toBe(0);
      expect(animation.lastTimestamp).toBe(START);
      expect(animation.startTimestamp).toBe(START);
    });

    test('does not inflate the next delta after an early frame', () => {
      const animation = startSpring(1, 0);
      animation.onFrame(animation, START);
      animation.onFrame(animation, START - 5);
      animation.onFrame(animation, START + 11);
      const afterEarlyPath = animation.current as number;

      const control = startSpring(1, 0);
      control.onFrame(control, START);
      control.onFrame(control, START + 11);
      const afterControl = control.current as number;

      expect(afterEarlyPath).toBeCloseTo(afterControl, 10);
      expect(afterEarlyPath).toBeLessThanOrEqual(1);
    });

    test('never overshoots past the target on the early first frame', () => {
      const animation = startSpring(1, 0, START, {
        damping: 20,
        mass: 0.3,
        stiffness: 60,
      });

      animation.onFrame(animation, START - 35);

      expect(animation.current).toBe(0);
      expect(animation.current as number).toBeGreaterThanOrEqual(0);
      expect(animation.current as number).toBeLessThanOrEqual(1);
    });
  });
});
