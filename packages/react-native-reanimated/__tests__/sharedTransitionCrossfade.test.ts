import {
  Easing,
  ReduceMotion,
  SharedTransition,
  withDelay,
  withSpring,
  withTiming,
} from '../src';
import type {
  AnimationObject,
  SharedTransitionCrossfadeWindow,
  SpringAnimation,
  TimingAnimation,
} from '../src';
import { withCrossfadeWindow } from '../src/layoutReanimation/crossfadeWindow';

const START = 1_000;
const DURATION = 1_000;

function timingProgress() {
  return withTiming(1, {
    duration: DURATION,
    easing: Easing.linear,
    reduceMotion: ReduceMotion.Never,
  }) as unknown as TimingAnimation;
}

function startWindow(
  start: number,
  end: number,
  from = 1,
  to = 0,
  progress = timingProgress()
) {
  const animation = withCrossfadeWindow(to, { start, end }, progress);
  animation.onStart(animation, from, START, null);
  return animation;
}

function valueAt(animation: ReturnType<typeof startWindow>, time: number) {
  animation.onFrame(animation, START + time);
  return animation.current;
}

describe('withCrossfadeWindow', () => {
  test('keeps the start value before the window and the end value after it', () => {
    const animation = startWindow(0.2, 0.4);

    expect(valueAt(animation, 100)).toBe(1);
    expect(valueAt(animation, 300)).toBeCloseTo(0.5);
    expect(valueAt(animation, 500)).toBe(0);
  });

  test('stays at the target value when a spring swings back into the window', () => {
    const spring = withSpring(1, {
      stiffness: 400,
      damping: 5,
      reduceMotion: ReduceMotion.Never,
    }) as unknown as SpringAnimation;
    const animation = startWindow(0.5, 1, 1, 0, spring);
    let passedEnd = false;
    for (let time = 16; time < 3_000; time += 16) {
      valueAt(animation, time);
      passedEnd = passedEnd || (spring.current as number) >= 1;
      if (passedEnd) {
        expect(animation.current).toBe(0);
      }
    }
    expect(passedEnd).toBe(true);
  });

  test('continues the fade when it restarts toward the same value', () => {
    const animation = startWindow(0, 1);
    valueAt(animation, 400);
    const restarted = withCrossfadeWindow(
      0,
      { start: 0, end: 1 },
      timingProgress()
    );
    restarted.onStart(restarted, animation.current, START + 400, animation);

    restarted.onFrame(restarted, START + 600);
    expect(restarted.current).toBeCloseTo(0.4);
  });

  test('starts a new fade when it restarts toward another value', () => {
    const animation = startWindow(0, 1);
    valueAt(animation, 400);
    const reversed = withCrossfadeWindow(
      1,
      { start: 0, end: 1 },
      timingProgress()
    );
    reversed.onStart(reversed, animation.current, START + 400, animation);

    reversed.onFrame(reversed, START + 900);
    expect(reversed.current).toBeCloseTo(0.6 + 0.4 * 0.5);
  });

  // With a delay, every value of the transition restarts after the new delay, so the fade does too.
  describe('with a delay', () => {
    const DELAY = 200;

    function delayedWindow(to: number) {
      return withDelay(
        DELAY,
        withCrossfadeWindow(to, { start: 0, end: 1 }, timingProgress()),
        ReduceMotion.Never
      ) as unknown as AnimationObject<number>;
    }

    function startDelayed(
      to: number,
      from: number,
      now: number,
      previous: AnimationObject<number> | null
    ) {
      const animation = delayedWindow(to);
      animation.onStart(animation, from, now, previous);
      return animation;
    }

    test('keeps the old fade during the new delay, then starts the window again from the current value', () => {
      const animation = startDelayed(0, 1, START, null);
      animation.onFrame(animation, START + DELAY);
      animation.onFrame(animation, START + DELAY + 400);
      expect(animation.current).toBeCloseTo(0.6);

      const restartTime = START + DELAY + 400;
      const restarted = startDelayed(
        0,
        animation.current as number,
        restartTime,
        animation
      );
      restarted.onFrame(restarted, restartTime + DELAY / 2);
      expect(restarted.current).toBeCloseTo(0.5);

      restarted.onFrame(restarted, restartTime + DELAY);
      expect(restarted.current).toBeCloseTo(0.5);
      restarted.onFrame(restarted, restartTime + DELAY + 500);
      expect(restarted.current).toBeCloseTo(0.25);
    });

    test('stays at the target value when the old fade ends during the new delay', () => {
      const animation = startDelayed(0, 1, START, null);
      animation.onFrame(animation, START + DELAY);
      animation.onFrame(animation, START + DELAY + 900);

      const restartTime = START + DELAY + 900;
      const restarted = startDelayed(
        0,
        animation.current as number,
        restartTime,
        animation
      );
      restarted.onFrame(restarted, restartTime + DELAY / 2);
      expect(restarted.current).toBe(0);
      restarted.onFrame(restarted, restartTime + DELAY);
      restarted.onFrame(restarted, restartTime + DELAY + 500);
      expect(restarted.current).toBe(0);
    });
  });

  test('ends at the target value when the progress ends', () => {
    const animation = startWindow(0, 0.3, 0.25, 1);

    expect(animation.onFrame(animation, START + DURATION)).toBe(true);
    expect(animation.current).toBe(1);
  });
});

describe('SharedTransition.crossfade', () => {
  test.each([
    [{ start: -0.1 }],
    [{ end: 1.5 }],
    [{ start: 0.5, end: 0.5 }],
    [{ start: 0.6, end: 0.4 }],
    [{ start: Number.NaN }],
    [{ start: null }],
    [{ end: '0.3' }],
    [{ end: true }],
  ])('rejects the window %j', (window) => {
    expect(() =>
      SharedTransition.crossfade(window as SharedTransitionCrossfadeWindow)
    ).toThrow('The crossfade window must have 0 <= start < end <= 1');
  });

  test('uses the whole transition by default', () => {
    expect(SharedTransition.crossfade().crossfadeV).toEqual({
      start: 0,
      end: 1,
    });
    expect(
      SharedTransition.duration(300).crossfade({ end: 0.3 }).crossfadeV
    ).toEqual({ start: 0, end: 0.3 });
  });
});
