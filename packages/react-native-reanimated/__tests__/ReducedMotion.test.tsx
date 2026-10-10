import { render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { ReducedMotionConfig, ReduceMotion, withTiming } from '../src';
import type { TimingAnimation } from '../src';

const START = 1_000;

const reduceMotionChanged = jest
  .mocked(AccessibilityInfo.addEventListener)
  .mock.calls.find(([eventName]) => eventName === 'reduceMotionChanged')?.[1];

function changeSystemReduceMotion(enabled: boolean) {
  if (reduceMotionChanged === undefined) {
    throw new Error('[Reanimated] Nothing listens to `reduceMotionChanged`.');
  }
  (reduceMotionChanged as (isEnabled: boolean) => void)(enabled);
}

function startDefaultTiming(): TimingAnimation {
  const animation = withTiming(1, {
    duration: 600_000,
  }) as unknown as TimingAnimation;
  animation.onStart(animation, 0, START, null);
  return animation;
}

function isReducingMotion() {
  const animation = startDefaultTiming();
  return animation.onFrame(animation, START + 1) && animation.current === 1;
}

describe('ReduceMotion.System follows a reduce-motion change made while the app runs', () => {
  let consoleWarn: jest.SpyInstance;

  beforeEach(() => {
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {
      // noop
    });
  });

  afterEach(() => {
    changeSystemReduceMotion(false);
    consoleWarn.mockRestore();
  });

  test('a default animation jumps to its end once reduce motion turns on', () => {
    expect(isReducingMotion()).toBe(false);

    changeSystemReduceMotion(true);

    expect(isReducingMotion()).toBe(true);
  });

  test('a default animation runs again once reduce motion turns off', () => {
    changeSystemReduceMotion(true);

    changeSystemReduceMotion(false);

    expect(isReducingMotion()).toBe(false);
  });

  test('a ReducedMotionConfig override keeps its mode across a system change', () => {
    render(<ReducedMotionConfig mode={ReduceMotion.Never} />);

    changeSystemReduceMotion(true);

    expect(isReducingMotion()).toBe(false);
  });

  test('a ReducedMotionConfig in System mode follows the change', () => {
    render(<ReducedMotionConfig mode={ReduceMotion.System} />);

    changeSystemReduceMotion(true);

    expect(isReducingMotion()).toBe(true);
  });

  test('unmounting an override restores the system setting as it is now, not as it was at mount', () => {
    const { unmount } = render(
      <ReducedMotionConfig mode={ReduceMotion.Never} />
    );
    changeSystemReduceMotion(true);

    unmount();

    expect(isReducingMotion()).toBe(true);
  });

  test('unmounting an override nested in another restores the outer override, which keeps ignoring the system', () => {
    render(<ReducedMotionConfig mode={ReduceMotion.Never} />);
    const { unmount } = render(
      <ReducedMotionConfig mode={ReduceMotion.Always} />
    );
    changeSystemReduceMotion(true);

    unmount();

    expect(isReducingMotion()).toBe(false);
    changeSystemReduceMotion(false);
    changeSystemReduceMotion(true);
    expect(isReducingMotion()).toBe(false);
  });
});
