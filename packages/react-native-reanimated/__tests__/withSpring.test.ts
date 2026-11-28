import { ReduceMotion, withSpring } from '../src';
import type { SpringAnimation } from '../src';

function startSpring(
  from: number,
  to: number,
  config: Parameters<typeof withSpring>[1],
  previousAnimation?: SpringAnimation
) {
  const animation = withSpring(to, {
    reduceMotion: ReduceMotion.Never,
    ...config,
  }) as unknown as SpringAnimation;
  animation.onStart(animation, from, 0, previousAnimation as SpringAnimation);
  return animation;
}

describe('withSpring velocity', () => {
  test('keeps config velocity pointing away from the target', () => {
    const animation = startSpring(-40, 0, { velocity: -1500 });
    expect(animation.velocity).toBe(-1500);

    animation.onFrame(animation, 16);
    expect(animation.current).toBeLessThan(-40);
  });

  test('keeps config velocity pointing toward the target', () => {
    const animation = startSpring(100, 0, { velocity: -800 });
    expect(animation.velocity).toBe(-800);
  });

  test('clips inherited velocity pointing away from the new target', () => {
    const previousAnimation = startSpring(0, 100, { velocity: 0 });
    previousAnimation.velocity = 500;
    previousAnimation.lastTimestamp = 0;

    const animation = startSpring(50, 0, {}, previousAnimation);
    expect(animation.velocity).toBe(0);
  });

  test('adds config velocity to clipped inherited velocity', () => {
    const previousAnimation = startSpring(0, 100, { velocity: 0 });
    previousAnimation.velocity = 500;
    previousAnimation.lastTimestamp = 0;

    const animation = startSpring(50, 0, { velocity: 300 }, previousAnimation);
    expect(animation.velocity).toBe(300);
  });

  test('clips inherited velocity before adding config velocity', () => {
    const previousAnimation = startSpring(0, 100, { velocity: 0 });
    previousAnimation.velocity = 500;
    previousAnimation.lastTimestamp = 0;

    const animation = startSpring(50, 0, { velocity: -800 }, previousAnimation);
    expect(animation.velocity).toBe(-800);
  });

  test('keeps inherited velocity pointing toward the new target', () => {
    const previousAnimation = startSpring(100, 0, { velocity: 0 });
    previousAnimation.velocity = -500;
    previousAnimation.lastTimestamp = 0;

    const animation = startSpring(50, 0, { velocity: -100 }, previousAnimation);
    expect(animation.velocity).toBe(-600);
  });
});
