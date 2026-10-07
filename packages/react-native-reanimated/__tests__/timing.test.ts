import { Easing, ReduceMotion, withTiming } from '../src';
import type {
  EasingFunction,
  EasingFunctionFactory,
  TimingAnimation,
} from '../src';

const START = 1_000;

function startTiming(
  toValue: number,
  duration: number,
  from: number,
  now = START,
  easing: EasingFunction | EasingFunctionFactory = Easing.linear
): TimingAnimation {
  const animation = withTiming(toValue, {
    duration,
    easing,
    reduceMotion: ReduceMotion.Never,
  }) as unknown as TimingAnimation;
  animation.onStart(animation, from, now, null);
  return animation;
}

describe('withTiming', () => {
  describe('negative runtime', () => {
    test.each([-0.1, -2.6, -5, -9, -9_000])(
      'rebases a first frame %sms before startTime and holds the start value',
      (runtime) => {
        const animation = startTiming(100, 300, 0);
        const finished = animation.onFrame(animation, START + runtime);

        expect(finished).toBe(false);
        expect(animation.current).toBe(0);
        expect(animation.startTime).toBe(START + runtime);
        expect(Number.isFinite(animation.current)).toBe(true);
      }
    );

    test('holds the start value when the animated value decreases', () => {
      const animation = startTiming(0, 300, 100);
      const finished = animation.onFrame(animation, START - 5);

      expect(finished).toBe(false);
      expect(animation.current).toBe(100);
      expect(animation.startTime).toBe(START - 5);
    });

    test('keeps the full duration measured from the frame that first progresses it', () => {
      const animation = startTiming(100, 300, 0);
      const firstFrame = START - 5;

      animation.onFrame(animation, firstFrame);

      expect(animation.onFrame(animation, firstFrame + 150)).toBe(false);
      expect(animation.current).toBe(50);
      expect(animation.startTime).toBe(firstFrame);

      expect(animation.onFrame(animation, firstFrame + 300)).toBe(true);
      expect(animation.current).toBe(100);
      expect(animation.startTime).toBe(0);
    });

    test('does not evaluate an easing that diverges below 0', () => {
      const easing = (t: number) => {
        'worklet';
        return 1000 * t;
      };
      const duration = 50;
      const runtime = -5;
      const animation = startTiming(411, duration, 0, START, easing);

      expect(animation.onFrame(animation, START + runtime)).toBe(false);
      expect(animation.current).toBe(0);
    });
  });

  describe('duration', () => {
    test.each([
      {
        runtime: 0,
        duration: 300,
        from: 0,
        to: 100,
        finished: false,
        current: 0,
      },
      {
        runtime: 150,
        duration: 300,
        from: 0,
        to: 100,
        finished: false,
        current: 50,
      },
      {
        runtime: 299,
        duration: 300,
        from: 0,
        to: 100,
        finished: false,
        current: (299 / 300) * 100,
      },
      {
        runtime: 300,
        duration: 300,
        from: 0,
        to: 100,
        finished: true,
        current: 100,
      },
      {
        runtime: 301,
        duration: 300,
        from: 0,
        to: 100,
        finished: true,
        current: 100,
      },
      {
        runtime: 0,
        duration: 0,
        from: 0,
        to: 100,
        finished: true,
        current: 100,
      },
      {
        runtime: 5,
        duration: 0,
        from: 10,
        to: 40,
        finished: true,
        current: 40,
      },
      { runtime: 0, duration: 0, from: 7, to: 7, finished: true, current: 7 },
      {
        runtime: 150,
        duration: 300,
        from: 100,
        to: 0,
        finished: false,
        current: 50,
      },
    ])(
      'runtime $runtime of duration $duration from $from to $to',
      ({ runtime, duration, from, to, finished, current }) => {
        const animation = startTiming(to, duration, from);

        expect(animation.onFrame(animation, START + runtime)).toBe(finished);
        expect(animation.current).toBeCloseTo(current);
        expect(animation.startTime).toBe(finished ? 0 : START);
        expect(Number.isFinite(animation.current)).toBe(true);
      }
    );

    test.each([-0.1, -5, -9])(
      'finishes a zero-duration animation when the first frame is %sms early',
      (runtime) => {
        const animation = startTiming(40, 0, 10);

        expect(animation.onFrame(animation, START + runtime)).toBe(true);
        expect(animation.current).toBe(40);
        expect(animation.startTime).toBe(0);
        expect(Number.isFinite(animation.current)).toBe(true);
      }
    );

    test('finishes a zero-duration animation onto the value it already holds', () => {
      const animation = startTiming(20, 0, 20);

      expect(animation.onFrame(animation, START - 5)).toBe(true);
      expect(animation.current).toBe(20);
      expect(Number.isFinite(animation.current)).toBe(true);
    });
  });

  describe('a timing continued onto the same target', () => {
    test('keeps the previous timeline and still rebaselines a frame before it', () => {
      const previous = startTiming(100, 300, 0, START);
      previous.onFrame(previous, START + 100);

      const animation = withTiming(100, {
        duration: 300,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }) as unknown as TimingAnimation;
      animation.onStart(animation, 40, START + 120, previous);

      expect(animation.startTime).toBe(START);
      expect(animation.startValue).toBe(0);

      const earlyFrame = START - 5;
      expect(animation.onFrame(animation, earlyFrame)).toBe(false);
      expect(animation.current).toBe(0);
      expect(animation.startTime).toBe(earlyFrame);
    });

    test('does not continue a finished timing, whose startTime was reset', () => {
      const previous = startTiming(100, 300, 0);
      previous.onFrame(previous, START + 300);
      expect(previous.startTime).toBe(0);

      const animation = withTiming(100, {
        duration: 300,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }) as unknown as TimingAnimation;
      animation.onStart(animation, 25, START + 400, previous);

      expect(animation.startTime).toBe(START + 400);
      expect(animation.startValue).toBe(25);
    });
  });
});
