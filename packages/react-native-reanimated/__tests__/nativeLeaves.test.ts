import { Easing, withDelay, withTiming } from '../src';
import type { AnimationObject } from '../src/commonTypes';
import {
  advanceNativeLeaf,
  relateToLiveLeaf,
} from '../src/layoutReanimation/nativeLeaves';

jest.mock('../src/featureFlags', () => ({
  ...jest.requireActual('../src/featureFlags'),
  getStaticFeatureFlag: (name: string) =>
    name === 'IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION',
}));

function onUIRuntime<T>(create: () => T): AnimationObject {
  const runtimeKind = globalThis.__RUNTIME_KIND;
  globalThis.__RUNTIME_KIND = 2;
  try {
    return create() as AnimationObject;
  } finally {
    globalThis.__RUNTIME_KIND = runtimeKind;
  }
}

const ORIGIN = 1000;
const START = 20;
const END = 120;
const DURATION = 400;
const timing = (toValue = END, duration = DURATION) =>
  withTiming(toValue, { duration, easing: Easing.linear });

/** The value of the native track: the delays, then a linear move. */
function trackValue(delaysMs: number[], now: number) {
  const delay = delaysMs.reduce((sum, each) => sum + Math.max(0, each), 0);
  const progress = Math.min(1, Math.max(0, (now - ORIGIN - delay) / DURATION));
  return START + progress * (END - START);
}

function wrapped(delaysMs: number[]) {
  return onUIRuntime(() =>
    [...delaysMs]
      .reverse()
      .reduce<unknown>(
        (animation, delay) => withDelay(delay, animation as number),
        timing()
      )
  );
}

describe('advanceNativeLeaf', () => {
  test.each([
    ['no delay', []],
    ['one delay', [100]],
    ['two delays', [100, 60]],
    ['a negative delay between two delays', [100, -500, 60]],
    ['a delay of zero', [0]],
  ])('%s: the leaf has the value of its track at each time', (_, delaysMs) => {
    for (const elapsed of [0, 50, 100, 130, 160, 200, 400, 559, 560, 900]) {
      const leaf = wrapped(delaysMs);
      advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + elapsed);
      expect(leaf.current).toBeCloseTo(
        trackValue(delaysMs, ORIGIN + elapsed),
        6
      );
    }
  });

  test('a second advance of one leaf gives the value of the later time', () => {
    const leaf = wrapped([100]);
    advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + 150);
    advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + 300);
    expect(leaf.current).toBeCloseTo(trackValue([100], ORIGIN + 300), 6);
  });

  test('a leaf whose timeline is over is finished and keeps its end value', () => {
    const leaf = wrapped([100]);
    advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + 600);
    expect(leaf.finished).toBe(true);
    advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + 700);
    expect(leaf.current).toBe(END);
  });

  test('a timing leaf keeps the start time and the start value of its track', () => {
    const leaf = onUIRuntime(() => timing());
    advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + 100);
    expect(leaf.startTime).toBe(ORIGIN);
    expect(leaf.startValue).toBe(START);
  });
});

describe('relateToLiveLeaf', () => {
  const live = (leaf: AnimationObject, elapsed = 100) => {
    advanceNativeLeaf(leaf, START, ORIGIN, ORIGIN + elapsed);
    return leaf;
  };
  const bare = () => onUIRuntime(() => timing());

  test('an absent leaf continues a timing and needs the frame driver for a delay', () => {
    expect(relateToLiveLeaf(live(bare()), undefined)).toBe('continues');
    expect(relateToLiveLeaf(live(wrapped([50])), undefined)).toBe(
      'frameDriver'
    );
  });

  test('a timing with another end value replaces the live leaf', () => {
    expect(
      relateToLiveLeaf(
        live(bare()),
        onUIRuntime(() => timing(END + 1))
      )
    ).toBe('replaces');
    expect(relateToLiveLeaf(live(wrapped([50])), bare())).toBe('replaces');
  });

  test('a timing with the same end value continues only with the same duration and easing', () => {
    expect(relateToLiveLeaf(live(bare()), bare())).toBe('continues');
    expect(
      relateToLiveLeaf(
        live(bare()),
        onUIRuntime(() => timing(END, DURATION / 2))
      )
    ).toBe('frameDriver');
    expect(
      relateToLiveLeaf(
        live(bare()),
        onUIRuntime(() =>
          withTiming(END, { duration: DURATION, easing: Easing.ease })
        )
      )
    ).toBe('frameDriver');
    expect(
      relateToLiveLeaf(
        live(
          onUIRuntime(() =>
            withTiming(END, {
              duration: DURATION,
              easing: Easing.bezier(0.1, 0.2, 0.3, 0.4),
            })
          )
        ),
        onUIRuntime(() =>
          withTiming(END, {
            duration: DURATION,
            easing: Easing.bezier(0.1, 0.2, 0.3, 0.4),
          })
        )
      )
    ).toBe('continues');
  });

  test('a timing with the same end value replaces a live leaf whose timeline is over', () => {
    expect(relateToLiveLeaf(live(bare(), 2 * DURATION), bare())).toBe(
      'replaces'
    );
  });

  test('a delayed leaf needs the frame driver', () => {
    expect(relateToLiveLeaf(live(bare()), wrapped([50]))).toBe('frameDriver');
  });
});
