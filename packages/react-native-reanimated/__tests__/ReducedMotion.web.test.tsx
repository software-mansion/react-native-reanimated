import type * as TestingLibrary from '@testing-library/react';

import type * as Reanimated from '../src';
import type { TimingAnimation } from '../src';

const START = 1_000;

type ChangeListener = (event: { readonly matches: boolean }) => void;

const reducedMotionQuery: { matches: boolean; listeners: ChangeListener[] } = {
  matches: false,
  listeners: [],
};

interface LoadedModules {
  readonly reanimated: typeof Reanimated;
  readonly render: typeof TestingLibrary.render;
}

function loadWithControllableMatchMedia(): LoadedModules {
  window.matchMedia = (query: string) =>
    ({
      get matches() {
        return reducedMotionQuery.matches;
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: ChangeListener) => {
        reducedMotionQuery.listeners.push(listener);
      },
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
  let loaded: LoadedModules | undefined;
  jest.isolateModules(() => {
    loaded = {
      reanimated: jest.requireActual<typeof Reanimated>('../src'),
      render: jest.requireActual<typeof TestingLibrary>(
        '@testing-library/react'
      ).render,
    };
  });
  if (loaded === undefined) {
    throw new Error('[Reanimated] The test could not load its modules.');
  }
  return loaded;
}

const { reanimated, render } = loadWithControllableMatchMedia();

function changeSystemReduceMotion(matches: boolean) {
  reducedMotionQuery.matches = matches;
  for (const listener of reducedMotionQuery.listeners) {
    listener({ matches });
  }
}

function isReducingMotion() {
  const animation = reanimated.withTiming(1, {
    duration: 600_000,
  }) as unknown as TimingAnimation;
  animation.onStart(animation, 0, START, null);
  return animation.onFrame(animation, START + 1) && animation.current === 1;
}

describe('ReduceMotion.System follows a prefers-reduced-motion change made while the page runs', () => {
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

  test('a default animation jumps to its end once the preference turns on', () => {
    expect(isReducingMotion()).toBe(false);

    changeSystemReduceMotion(true);

    expect(isReducingMotion()).toBe(true);
  });

  test('a ReducedMotionConfig override keeps its mode across a change', () => {
    render(
      <reanimated.ReducedMotionConfig mode={reanimated.ReduceMotion.Never} />
    );

    changeSystemReduceMotion(true);

    expect(isReducingMotion()).toBe(false);
  });

  test('unmounting an override restores the preference as it is now, not as it was at mount', () => {
    const { unmount } = render(
      <reanimated.ReducedMotionConfig mode={reanimated.ReduceMotion.Never} />
    );
    changeSystemReduceMotion(true);

    unmount();

    expect(isReducingMotion()).toBe(true);
  });
});
