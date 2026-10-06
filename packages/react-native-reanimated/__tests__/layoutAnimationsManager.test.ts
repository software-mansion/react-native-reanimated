import {
  Easing,
  FadeIn,
  SlideInLeft,
  withDelay,
  withSpring,
  withTiming,
} from '../src';
import type {
  AnimatableValue,
  AnimationObject,
  EntryAnimationsValues,
  LayoutAnimation,
  Timestamp,
} from '../src/commonTypes';
import { LayoutAnimationType, ReduceMotion } from '../src/commonTypes';
import { initializeLayoutAnimationsManager } from '../src/layoutReanimation/animationsManager.native';

jest.mock('../src/featureFlags', () => ({
  ...jest.requireActual('../src/featureFlags'),
  getStaticFeatureFlag: (name: string) =>
    name === 'IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION',
}));

jest.mock('react-native-worklets', () =>
  jest.requireActual('../../react-native-worklets/src/mock')
);

initializeLayoutAnimationsManager();
const manager = globalThis.LayoutAnimationsManager;
const originalGlobals = {
  frameTimestamp: globalThis.__frameTimestamp,
  getAnimationTimestamp: globalThis._getAnimationTimestamp,
  maybeFlushUIUpdatesQueue: globalThis._maybeFlushUIUpdatesQueue,
  notifyAboutEnd: globalThis._notifyAboutEnd,
  notifyAboutProgress: globalThis._notifyAboutProgress,
  requestAnimationFrameFinalizer: globalThis.requestAnimationFrameFinalizer,
};

function makeConfig(startTimestamps: number[]) {
  return (): LayoutAnimation => {
    const originXAnimation: AnimationObject = {
      current: 1,
      onStart(
        animation: AnimationObject,
        _value: AnimatableValue,
        timestamp: Timestamp
      ) {
        startTimestamps.push(timestamp);
        animation.current = 0;
      },
      onFrame(animation: AnimationObject) {
        animation.current = 1;
        return true;
      },
    };

    return {
      initialValues: { originX: 0 },
      // LayoutAnimation's public type describes resolved style values even
      // though the manager receives animation objects at runtime.
      animations: { originX: originXAnimation as unknown as number },
    };
  };
}

function makePendingConfig(callback: jest.Mock) {
  return (): LayoutAnimation => ({
    initialValues: { originX: 0 },
    animations: {
      originX: {
        current: 0,
        onStart: jest.fn(),
        onFrame() {
          return false;
        },
      } as unknown as number,
    },
    callback,
  });
}

const LIMITS = { leaves: 3, transformOperations: 4, segments: 8 };

const linearPhase = (toValue: number | string, durationMs: number) => ({
  kind: 'timing',
  durationMs,
  toValue,
  easing: { kind: 'linear' },
});

const onUIRuntime = <T>(create: () => T): T => {
  const runtimeKind = globalThis.__RUNTIME_KIND;
  globalThis.__RUNTIME_KIND = 2;
  try {
    return create();
  } finally {
    globalThis.__RUNTIME_KIND = runtimeKind;
  }
};

describe('LayoutAnimationsManager', () => {
  let frameFinalizers: Array<() => void>;
  let getAnimationTimestamp: jest.Mock;

  beforeEach(() => {
    frameFinalizers = [];
    getAnimationTimestamp = jest.fn();
    globalThis.__frameTimestamp = undefined;
    globalThis._getAnimationTimestamp = getAnimationTimestamp;
    globalThis.requestAnimationFrameFinalizer = (callback) => {
      frameFinalizers.push(callback);
    };
    globalThis._notifyAboutProgress = jest.fn();
    globalThis._notifyAboutEnd = jest.fn();
    globalThis._maybeFlushUIUpdatesQueue = jest.fn();
  });

  afterEach(() => {
    frameFinalizers.splice(0).forEach((finalizer) => finalizer());
    globalThis.__frameTimestamp = originalGlobals.frameTimestamp;
    globalThis._getAnimationTimestamp = originalGlobals.getAnimationTimestamp;
    globalThis.requestAnimationFrameFinalizer =
      originalGlobals.requestAnimationFrameFinalizer;
    globalThis._notifyAboutProgress = originalGlobals.notifyAboutProgress;
    globalThis._notifyAboutEnd = originalGlobals.notifyAboutEnd;
    globalThis._maybeFlushUIUpdatesQueue =
      originalGlobals.maybeFlushUIUpdatesQueue;
  });

  test('initializes only once', () => {
    initializeLayoutAnimationsManager();

    expect(globalThis.LayoutAnimationsManager).toBe(manager);
  });

  test('uses one start timestamp for animations started before the next frame', () => {
    const startTimestamps: number[] = [];
    const config = makeConfig(startTimestamps);
    getAnimationTimestamp.mockReturnValueOnce(100).mockReturnValueOnce(200);

    manager.start(1, LayoutAnimationType.LAYOUT, {}, config);
    manager.start(2, LayoutAnimationType.LAYOUT, {}, config);

    expect(startTimestamps).toEqual([100, 100]);
    expect(getAnimationTimestamp).toHaveBeenCalledTimes(1);
    expect(globalThis.__frameTimestamp).toBeUndefined();

    frameFinalizers.splice(0).forEach((finalizer) => finalizer());
    manager.start(3, LayoutAnimationType.LAYOUT, {}, config);

    expect(startTimestamps).toEqual([100, 100, 200]);
    expect(getAnimationTimestamp).toHaveBeenCalledTimes(2);
    expect(globalThis.__frameTimestamp).toBeUndefined();
  });

  test('uses the timestamp already shared by the current frame', () => {
    const startTimestamps: number[] = [];
    const config = makeConfig(startTimestamps);
    globalThis.__frameTimestamp = 300;

    manager.start(4, LayoutAnimationType.LAYOUT, {}, config);
    manager.start(5, LayoutAnimationType.LAYOUT, {}, config);

    expect(startTimestamps).toEqual([300, 300]);
    expect(getAnimationTimestamp).not.toHaveBeenCalled();
    expect(globalThis.__frameTimestamp).toBe(300);
  });

  test('does not report native ends across three replacements', () => {
    const callbacks = [jest.fn(), jest.fn(), jest.fn(), jest.fn()];

    callbacks.forEach((callback) => {
      manager.start(
        6,
        LayoutAnimationType.LAYOUT,
        {},
        makePendingConfig(callback)
      );
    });

    callbacks.slice(0, -1).forEach((callback) => {
      expect(callback).toHaveBeenCalledWith(false);
    });
    expect(callbacks.at(-1)).not.toHaveBeenCalled();
    expect(globalThis._notifyAboutEnd).not.toHaveBeenCalled();

    manager.stop(6);
  });

  test('does not report a native end when stopping a replacement', () => {
    const previousCallback = jest.fn();
    const replacementCallback = jest.fn();

    manager.start(
      8,
      LayoutAnimationType.LAYOUT,
      {},
      makePendingConfig(previousCallback)
    );
    manager.start(
      8,
      LayoutAnimationType.LAYOUT,
      {},
      makePendingConfig(replacementCallback)
    );
    manager.stop(8);

    expect(previousCallback).toHaveBeenCalledWith(false);
    expect(replacementCallback).toHaveBeenCalledWith(false);
    expect(globalThis._notifyAboutEnd).not.toHaveBeenCalled();
  });

  test('reports exactly one native end when an animation finishes', () => {
    manager.start(7, LayoutAnimationType.EXITING, {}, makeConfig([]));

    expect(globalThis._notifyAboutEnd).toHaveBeenCalledTimes(1);
    expect(globalThis._notifyAboutEnd).toHaveBeenCalledWith(7, true);
  });

  test('reports both completions when a tag restarts before a pull', () => {
    const config = makeConfig([]);

    manager.start(9, LayoutAnimationType.LAYOUT, {}, config);
    manager.start(9, LayoutAnimationType.LAYOUT, {}, config);

    expect(globalThis._notifyAboutEnd).toHaveBeenCalledTimes(2);
    expect(globalThis._notifyAboutEnd).toHaveBeenNthCalledWith(1, 9, false);
    expect(globalThis._notifyAboutEnd).toHaveBeenNthCalledWith(2, 9, false);
  });
  describe('builds', () => {
    const summaryOf = (buildId: number, config: () => LayoutAnimation) =>
      manager.build(buildId, {}, config, LIMITS, []);

    test('the builder runs one time for a build and its frame-driven start', () => {
      const startTimestamps: number[] = [];
      const config = jest.fn(makeConfig(startTimestamps));
      getAnimationTimestamp.mockReturnValueOnce(100).mockReturnValueOnce(200);

      const summary = summaryOf(1, config);
      manager.startBuilt(10, LayoutAnimationType.LAYOUT, 1, []);

      expect(config).toHaveBeenCalledTimes(1);
      expect(summary?.originMs).toBe(100);
      expect(startTimestamps).toEqual([100]);
    });

    test('the summary gives each leaf with its initial value', () => {
      const summary = summaryOf(2, () => ({
        initialValues: { originX: 5, opacity: 1 },
        animations: {
          originX: {
            __nativeTiming: {
              phases: [
                { kind: 'hold', durationMs: 10 },
                { kind: 'hold', durationMs: 20 },
                linearPhase(9, 100),
              ],
            },
          } as unknown as number,
          originY: {
            reduceMotion: true,
            __nativeTiming: { phases: [linearPhase(9, 100)] },
          } as unknown as number,
        },
      }));
      manager.releaseBuilt(2);

      expect(summary).toMatchObject({
        exceedsLimit: false,
        hasInitialOnlyKeys: true,
        needsFrameDriver: false,
        leaves: [
          {
            key: 'originX',
            initialValue: 5,
            track: {
              delayMs: 30,
              durationMs: 100,
              segments: [{ endOffset: 1, endValue: 9 }],
            },
            continuesLiveLeaf: false,
          },
          { key: 'originY', initialValue: undefined },
        ],
      });
    });

    test('a scalar leaf whose end value is a string has no track', () => {
      const summary = summaryOf(6, () => ({
        initialValues: { originX: 5 },
        animations: {
          originX: {
            __nativeTiming: { phases: [linearPhase('9px', 100)] },
          } as unknown as number,
        },
      }));
      manager.releaseBuilt(6);

      expect(summary?.leaves).toEqual([
        { key: 'originX', initialValue: 5, continuesLiveLeaf: false },
      ]);
    });

    test('the summary has no leaves when the builder gives too many', () => {
      const summary = summaryOf(3, () => ({
        initialValues: {},
        animations: { originX: 1, originY: 1, width: 1, height: 1 },
      }));
      manager.releaseBuilt(3);

      expect(summary).toMatchObject({ exceedsLimit: true, leaves: [] });
    });

    test('a builder error goes to the frame-driven start and the builder does not run again', () => {
      const config = jest.fn(() => {
        throw new Error('[Reanimated] builder error');
      });

      expect(summaryOf(4, config)).toBeUndefined();
      expect(() =>
        manager.startBuilt(11, LayoutAnimationType.LAYOUT, 4, [])
      ).toThrow('builder error');
      expect(config).toHaveBeenCalledTimes(1);
    });

    test('the callback of a native build gets one result', () => {
      const callback = jest.fn();
      const config = makePendingConfig(callback);
      summaryOf(5, () => Object.freeze(config()));

      manager.finishBuilt(5, false);
      manager.finishBuilt(5, true);
      manager.releaseBuilt(5);
      manager.finishBuilt(5, true);

      expect(callback.mock.calls).toEqual([[false]]);
    });
  });

  describe('builds of entering presets', () => {
    const VALUES = {
      targetOriginX: 30,
      targetOriginY: 0,
      targetWidth: 50,
      targetHeight: 50,
      targetGlobalOriginX: 30,
      targetGlobalOriginY: 0,
      windowWidth: 400,
      windowHeight: 800,
    };
    let lastBuildId = 100;
    const leavesOf = (
      entering: (values: EntryAnimationsValues) => LayoutAnimation
    ) => {
      const buildId = ++lastBuildId;
      const summary = manager.build(
        buildId,
        VALUES,
        () => onUIRuntime(() => entering(VALUES)),
        LIMITS,
        []
      );
      manager.releaseBuilt(buildId);
      return summary?.leaves;
    };
    const linear = <Builder extends FadeIn | SlideInLeft>(builder: Builder) =>
      builder.duration(400).easing(Easing.linear);

    test('the initial values of a preset are the start values of its leaves', () => {
      expect(leavesOf(linear(new FadeIn()).build())).toEqual([
        {
          key: 'opacity',
          initialValue: 0,
          track: {
            delayMs: 0,
            durationMs: 400,
            segments: [{ endOffset: 1, endValue: 1 }],
          },
          continuesLiveLeaf: false,
        },
      ]);
      expect(leavesOf(linear(new SlideInLeft()).build())).toEqual([
        {
          key: 'originX',
          initialValue: -370,
          track: {
            delayMs: 0,
            durationMs: 400,
            segments: [{ endOffset: 1, endValue: 30 }],
          },
          continuesLiveLeaf: false,
        },
      ]);
    });

    test('each build of a preset with a random delay has the one delay that the preset resolved', () => {
      const random = jest
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0.25)
        .mockReturnValue(0.75);
      const entering = linear(new FadeIn()).delay(800).randomDelay().build();

      const delays = [leavesOf(entering), leavesOf(entering)].map(
        (leaves) => leaves?.[0].track?.delayMs
      );
      random.mockRestore();

      expect(delays).toEqual([200, 200]);
    });

    test('a negative delay of a preset is no delay', () => {
      const leaves = leavesOf(linear(new FadeIn()).delay(-500).build());

      expect(leaves?.[0].track).toEqual({
        delayMs: 0,
        durationMs: 400,
        segments: [{ endOffset: 1, endValue: 1 }],
      });
    });

    test('a preset with reduced motion has no track', () => {
      const withDelayWrapper = linear(new FadeIn())
        .delay(100)
        .reduceMotion(ReduceMotion.Always);
      const withoutDelayWrapper = linear(new FadeIn()).reduceMotion(
        ReduceMotion.Always
      );

      expect(leavesOf(withDelayWrapper.build())?.[0].track).toBeUndefined();
      expect(leavesOf(withoutDelayWrapper.build())?.[0].track).toBeUndefined();
    });
  });

  describe('tracks of an easing function', () => {
    type Segment = {
      endOffset: number;
      endValue: unknown;
      cubicBezier?: number[];
    };
    let lastBuildId = 200;
    const summaryOf = (
      key: string,
      initial: unknown,
      create: () => unknown,
      limits = LIMITS
    ) => {
      const buildId = ++lastBuildId;
      const summary = manager.build(
        buildId,
        {},
        () =>
          ({
            initialValues: { [key]: initial },
            animations: { [key]: onUIRuntime(create) },
          }) as LayoutAnimation,
        limits,
        []
      );
      manager.releaseBuilt(buildId);
      return summary!;
    };
    const segmentsOf = (...args: Parameters<typeof summaryOf>) =>
      summaryOf(...args).leaves[0].track?.segments as Segment[] | undefined;
    const counted = (easing: (time: number) => number) => {
      const counter = { calls: 0 };
      return {
        counter,
        easing: (time: number) => {
          counter.calls++;
          return easing(time);
        },
      };
    };
    /** The value of a track of numbers at a part of its duration. */
    const valueAt = (start: number, segments: Segment[], time: number) => {
      let offset = 0;
      let value = start;
      for (const { endOffset, endValue, cubicBezier } of segments) {
        if (time <= endOffset) {
          const [x1, y1, x2, y2] = cubicBezier ?? [1 / 3, 1 / 3, 2 / 3, 2 / 3];
          expect([x1, x2]).toEqual([1 / 3, 2 / 3]);
          const u = (time - offset) / (endOffset - offset);
          const progress =
            3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3;
          return value + ((endValue as number) - value) * progress;
        }
        offset = endOffset;
        value = endValue as number;
      }
      return NaN;
    };

    test('the default easing is two segments that are exact', () => {
      const segments = segmentsOf('opacity', 0, () =>
        withTiming(1, { duration: 400 })
      )!;
      expect(segments).toHaveLength(2);
      expect(segments.map(({ endOffset }) => endOffset)).toEqual([0.5, 1]);
      expect(segments.map(({ endValue }) => endValue)).toEqual([0.5, 1]);
      [1 / 3, 0, 2 / 3, 1 / 3].forEach((point, index) =>
        expect(segments[0].cubicBezier![index]).toBeCloseTo(point, 12)
      );
      [1 / 3, 2 / 3, 2 / 3, 1].forEach((point, index) =>
        expect(segments[1].cubicBezier![index]).toBeCloseTo(point, 12)
      );
    });

    test.each([
      ['Easing.bounce', Easing.bounce, 0.1],
      ['Easing.out(Easing.back(1.7))', Easing.out(Easing.back(1.7)), 1e-9],
      ['Easing.elastic(2)', Easing.elastic(2), 0.1],
    ])(
      'the track of %s is the value of the frame driver at each time',
      (_, easing, tolerance) => {
        const segments = segmentsOf(
          'originX',
          20,
          () => withTiming(120, { easing }),
          { ...LIMITS, segments: 64 }
        )!;
        for (let index = 0; index <= 1000; index++) {
          const time = index / 1000;
          const difference =
            valueAt(20, segments, time) - (20 + 100 * easing(time));
          expect(Math.abs(difference)).toBeLessThanOrEqual(tolerance);
        }
      }
    );

    test('a longer travel in points gives more segments, and a value that is not in points does not', () => {
      const counts = (key: string) =>
        [100, 2500].map(
          (end) =>
            segmentsOf(key, 0, () => withTiming(end, { easing: Easing.sin }))
              ?.length
        );
      expect(counts('originX')).toEqual([2, 4]);
      expect(counts('width')).toEqual([2, 4]);
      expect(counts('opacity')).toEqual([2, 2]);
    });

    test.each([
      ['Easing.steps(4)', Easing.steps(4), 100],
      ['Easing.circle', Easing.circle, 100],
      ['Easing.exp over 251 pt', Easing.exp, 251],
    ])('%s has no track', (_, easing, end) => {
      expect(
        segmentsOf('originX', 0, () => withTiming(end, { easing }))
      ).toBeUndefined();
    });

    test('Easing.exp over 250 pt has a track', () => {
      expect(
        segmentsOf('originX', 0, () => withTiming(250, { easing: Easing.exp }))
      ).toHaveLength(4);
    });

    test('a part of an easing with no change is a segment that keeps the value of the segment before it', () => {
      const easing = (time: number) =>
        time < 0.25 ? 2 * time : time < 0.75 ? 0.5 : 2 * time - 1;
      const segments = segmentsOf('opacity', 0, () =>
        withTiming(1, { easing })
      )!;
      expect(
        segments.map(({ endOffset, endValue }) => [endOffset, endValue])
      ).toEqual([
        [0.25, 0.5],
        [0.5, 0.5],
        [0.75, 0.5],
        [1, 1],
      ]);
      expect(segments[1].cubicBezier).toBeUndefined();
      expect(segments[2].cubicBezier).toBeUndefined();
    });

    test.each([
      ['a leaf with no duration', 0, 100, 0],
      ['a leaf that does not change its value', 100, 100, 400],
    ])(
      '%s is one segment and the easing does not run',
      (_, initial, end, duration) => {
        const { counter, easing } = counted(Easing.bounce);
        const segments = segmentsOf('originX', initial, () =>
          withTiming(end, { duration, easing })
        );
        expect(segments).toEqual([{ endOffset: 1, endValue: end }]);
        expect(counter.calls).toBe(0);
      }
    );

    test('a leaf with the easing function and the tolerance of an earlier leaf uses the fit of that leaf', () => {
      const { counter, easing } = counted(Easing.sin);
      const animation = (end: number) => () => withTiming(end, { easing });
      segmentsOf('opacity', 0, animation(1));
      const callsOfFirstFit = counter.calls;
      expect(callsOfFirstFit).toBeGreaterThan(0);

      expect(segmentsOf('opacity', 0.5, animation(1))).toHaveLength(2);
      expect(segmentsOf('originX', 0, animation(250))).toHaveLength(2);
      expect(counter.calls).toBe(callsOfFirstFit);

      segmentsOf('originX', 0, animation(251));
      const callsOfSecondFit = counter.calls;
      expect(callsOfSecondFit).toBeGreaterThan(callsOfFirstFit);
      segmentsOf('originX', 0, animation(500));
      expect(counter.calls).toBe(callsOfSecondFit);
    });

    test('more segments than the limit give no leaves', () => {
      const withDefault = () => withTiming(1);
      const limitOf = (segments: number) => ({ ...LIMITS, segments });
      expect(summaryOf('opacity', 0, withDefault, limitOf(2))).toMatchObject({
        exceedsLimit: false,
      });
      expect(summaryOf('opacity', 0, withDefault, limitOf(1))).toMatchObject({
        exceedsLimit: true,
        leaves: [],
      });
      expect(
        summaryOf('opacity', 0, () => withTiming(1, { easing: Easing.bounce }))
      ).toMatchObject({ exceedsLimit: true, leaves: [] });
    });

    test('the operations of a transform with the default easing have one track', () => {
      const segments = segmentsOf(
        'transform',
        [{ scale: 0 }, { rotate: '0deg' }],
        () => [{ scale: withTiming(1) }, { rotate: withTiming('90deg') }]
      )!;
      expect(segments.map(({ endOffset }) => endOffset)).toEqual([0.5, 1]);
      expect(segments[0].endValue).toEqual([
        { kind: 'scale', value: 0.5 },
        { kind: 'rotate', value: Math.PI / 4 },
      ]);
      expect(segments[1].endValue).toEqual([
        { kind: 'scale', value: 1 },
        { kind: 'rotate', value: Math.PI / 2 },
      ]);
    });

    test('operations with one easing function have one track, and with two functions they have none', () => {
      const shared = Easing.out(Easing.quad);
      const operations =
        (first: typeof shared, second: typeof shared) => () => [
          { scale: withTiming(1, { easing: first }) },
          { translateX: withTiming(10, { easing: second }) },
        ];
      const initial = [{ scale: 0 }, { translateX: 0 }];
      expect(
        segmentsOf('transform', initial, operations(shared, shared))
      ).toHaveLength(1);
      expect(
        segmentsOf(
          'transform',
          initial,
          operations(shared, Easing.out(Easing.quad))
        )
      ).toBeUndefined();
    });
  });

  describe('live leaves of native tracks', () => {
    const TAG = 20;
    const X = { buildId: 21, key: 'originX' };
    let frames: Array<(timestamp: number) => void>;
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

    const timing = (toValue: number, duration: number) =>
      onUIRuntime(() =>
        withTiming(toValue, { duration, easing: Easing.linear })
      );
    const configOf =
      (
        initialValues: Record<string, number>,
        animations: Record<string, unknown>,
        callback?: (finished: boolean) => void
      ) =>
      (): LayoutAnimation => ({
        initialValues,
        animations: animations as Record<string, number>,
        callback,
      });
    const lastProgress = () =>
      (globalThis._notifyAboutProgress as jest.Mock).mock.calls.at(-1)[1];
    const runFrame = (timestamp: number) => {
      globalThis.__frameTimestamp = timestamp;
      frames.splice(0).forEach((frame) => frame(timestamp));
      globalThis.__frameTimestamp = undefined;
    };
    const startBatchAt = (timestamp: number) => {
      frameFinalizers.splice(0).forEach((finalizer) => finalizer());
      getAnimationTimestamp.mockReturnValue(timestamp);
    };

    beforeEach(() => {
      frames = [];
      globalThis.requestAnimationFrame = (frame) => frames.push(frame);
      // The native X: 0 to 100 in 400 ms, from the time 1000.
      startBatchAt(1000);
      manager.build(
        X.buildId,
        {},
        configOf({ originX: 0 }, { originX: timing(100, 400) }),
        LIMITS,
        []
      );
      startBatchAt(1100);
    });

    afterEach(() => {
      manager.stop(TAG);
      manager.releaseBuilt(X.buildId);
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    });

    test('the capture gives the value of each live leaf at the batch time', () => {
      expect(manager.captureLiveLeaves([X])).toEqual({ originX: 25 });
    });

    test('a new leaf with another end value replaces the live leaf', () => {
      const summary = manager.build(
        22,
        {},
        configOf({ originX: 25 }, { originX: timing(50, 400) }),
        LIMITS,
        [X]
      );
      manager.releaseBuilt(22);
      expect(summary).toMatchObject({
        needsFrameDriver: false,
        leaves: [{ key: 'originX', continuesLiveLeaf: false }],
      });
    });

    test('a new leaf with the same end value and timing continues the live leaf', () => {
      const summary = manager.build(
        22,
        {},
        configOf(
          { originX: 25, originY: 0 },
          { originX: timing(100, 400), originY: timing(40, 400) }
        ),
        LIMITS,
        [X]
      );
      manager.releaseBuilt(22);
      expect(summary).toMatchObject({
        needsFrameDriver: false,
        leaves: [
          { key: 'originX', continuesLiveLeaf: true },
          { key: 'originY', continuesLiveLeaf: false },
        ],
      });
    });

    test('a new leaf with the same end value and another duration needs the frame driver', () => {
      const summary = manager.build(
        22,
        {},
        configOf({ originX: 25 }, { originX: timing(100, 200) }),
        LIMITS,
        [X]
      );
      manager.releaseBuilt(22);
      expect(summary?.needsFrameDriver).toBe(true);
    });

    test('a frame-driven start keeps a live leaf that it does not replace on its timeline', () => {
      const callback = jest.fn();
      manager.build(
        22,
        {},
        configOf({ originY: 0 }, { originY: timing(40, 100) }, callback),
        LIMITS,
        [X]
      );
      manager.startBuilt(TAG, LayoutAnimationType.LAYOUT, 22, [X]);
      expect(lastProgress()).toEqual({ originX: 25, originY: 0 });

      runFrame(1150);
      expect(lastProgress()).toEqual({ originX: 37.5, originY: 20 });
      runFrame(1300);
      expect(lastProgress()).toEqual({ originX: 75, originY: 40 });
      expect(callback).not.toHaveBeenCalled();
      runFrame(1400);
      expect(lastProgress()).toEqual({ originX: 100, originY: 40 });
      expect(callback.mock.calls).toEqual([[true]]);
    });

    test('a frame-driven start with the same end value keeps the start time and takes the new duration', () => {
      manager.build(
        22,
        {},
        configOf({ originX: 25 }, { originX: timing(100, 200) }),
        LIMITS,
        [X]
      );
      manager.startBuilt(TAG, LayoutAnimationType.LAYOUT, 22, [X]);
      // 100 ms of 200 ms from the start time and the start value of the live leaf.
      expect(lastProgress()).toEqual({ originX: 50 });
      runFrame(1150);
      expect(lastProgress()).toEqual({ originX: 75 });
    });

    test('a delayed frame-driven start runs the live leaf until its delay ends', () => {
      const delayed = onUIRuntime(() =>
        withDelay(100, timing(0, 100) as unknown as number)
      );
      manager.build(
        22,
        {},
        configOf({ originX: 25 }, { originX: delayed }),
        LIMITS,
        [X]
      );
      manager.startBuilt(TAG, LayoutAnimationType.LAYOUT, 22, [X]);
      expect(lastProgress()).toEqual({ originX: 25 });
      runFrame(1150);
      expect(lastProgress()).toEqual({ originX: 37.5 });
      // The new leaf starts in the frame in which its delay ends, from the value of the frame before.
      runFrame(1200);
      expect(lastProgress()).toEqual({ originX: 37.5 });
      runFrame(1250);
      expect(lastProgress()).toEqual({ originX: 18.75 });
    });

    test('a frame-driven start of a build whose delay ended plays the leaf from the end of the delay', () => {
      const delayed = onUIRuntime(() =>
        withDelay(500, timing(100, 1000) as unknown as number)
      );
      startBatchAt(2000);
      manager.build(
        23,
        {},
        configOf({ originY: 0 }, { originY: delayed }),
        LIMITS,
        []
      );
      startBatchAt(3000);
      manager.startBuilt(TAG, LayoutAnimationType.LAYOUT, 23, []);
      runFrame(3100);
      expect(lastProgress()).toEqual({ originY: 60 });
      runFrame(3500);
      expect(lastProgress()).toEqual({ originY: 100 });
    });

    test('an easing with mutable state: the track is the fit of the build, a later build has the same fit, and the frame driver reads the state in each frame', () => {
      const state = { exponent: 1 };
      const easing = (time: number) => time ** state.exponent;
      const config = configOf(
        { originY: 0 },
        {
          originY: onUIRuntime(() =>
            withTiming(100, { duration: 400, easing })
          ),
        }
      );
      const segmentsOf = (buildId: number) =>
        manager.build(buildId, {}, config, LIMITS, [])!.leaves[0].track!
          .segments;
      startBatchAt(2000);
      const atBuild = segmentsOf(24);
      expect(atBuild).toHaveLength(1);
      expect(atBuild[0].endValue).toBe(100);
      [1 / 3, 1 / 3, 2 / 3, 2 / 3].forEach((point, index) =>
        expect(atBuild[0].cubicBezier![index]).toBeCloseTo(point, 12)
      );

      state.exponent = 2;
      expect(segmentsOf(25)).toEqual(atBuild);
      manager.releaseBuilt(25);

      manager.startBuilt(TAG, LayoutAnimationType.LAYOUT, 24, []);
      runFrame(2200);
      expect(lastProgress()).toEqual({ originY: 25 });
      state.exponent = 3;
      runFrame(2200);
      expect(lastProgress()).toEqual({ originY: 12.5 });
    });

    describe('a transform leaf', () => {
      type Operations = Record<string, unknown>[];
      const T = { buildId: 31, key: 'transform' };
      const FRAME_TAG = 32;
      const DEGREE = Math.PI / 180;
      const DURATION = 400;

      const move = (toValue: number | string, duration = DURATION) =>
        onUIRuntime(() =>
          withTiming(toValue, { duration, easing: Easing.linear })
        );
      const transformOf = (
        initial: Operations,
        animations: Operations,
        others: Record<string, unknown> = {}
      ) =>
        configOf({ transform: initial } as unknown as Record<string, number>, {
          transform: animations,
          ...others,
        });
      const leafOf = (
        config: () => LayoutAnimation,
        live = [] as (typeof T)[]
      ) => {
        const summary = manager.build(
          33,
          {},
          config,
          { leaves: 6, transformOperations: 4, segments: 8 },
          live
        )!;
        manager.releaseBuilt(33);
        return { ...summary, leaf: summary.leaves[0] };
      };
      const operationsOf = (value: unknown) =>
        value as { kind: string; value: number }[];
      // React Native reads a number as radians and a string with its unit.
      const scalarOf = (operation: Record<string, unknown>) => {
        const value = Object.values(operation)[0];
        return typeof value === 'string'
          ? parseFloat(value) * (value.endsWith('deg') ? DEGREE : 1)
          : (value as number);
      };
      const shownScalars = () =>
        (lastProgress().transform as Record<string, unknown>[]).map(scalarOf);

      const nativeForms: [string, Operations, () => Operations][] = [
        [
          'numbers',
          [{ rotate: 0 }, { translateX: 5 }],
          () => [{ rotate: move(2) }, { translateX: move(45) }],
        ],
        [
          'angles in degrees',
          [{ rotate: '10deg' }, { rotateX: '0deg' }],
          () => [{ rotate: move('100deg') }, { rotateX: move('-720deg') }],
        ],
        [
          'angles in radians',
          [{ rotateY: '0rad' }, { rotateZ: '1rad' }],
          () => [{ rotateY: move('3rad') }, { rotateZ: move('1rad') }],
        ],
        [
          'a plain value that is not the initial value',
          [{ scale: 1 }, { translateX: 0 }],
          () => [{ scale: move(2) }, { translateX: 30 }],
        ],
        [
          'a plain angle',
          [{ rotate: '10deg' }, { scaleX: 1 }],
          () => [{ rotate: '40deg' }, { scaleX: move(0.5) }],
        ],
        [
          'a timing with no duration',
          [{ translateY: 0 }, { scaleY: 1 }],
          () => [{ translateY: move(20, 0) }, { scaleY: move(3) }],
        ],
      ];
      test.each(nativeForms)(
        '%s: the summary has the values that the frame driver shows',
        (_, initial, animations) => {
          const { leaf } = leafOf(transformOf(initial, animations()));
          const starts = operationsOf(leaf.initialValue);
          const ends = operationsOf(leaf.track!.segments[0].endValue);
          expect(leaf.track).toMatchObject({
            durationMs: DURATION,
            delayMs: 0,
          });
          expect(starts.map(({ kind }) => kind)).toEqual(
            initial.map((operation) => Object.keys(operation)[0])
          );

          startBatchAt(2000);
          manager.start(
            FRAME_TAG,
            LayoutAnimationType.LAYOUT,
            {},
            transformOf(initial, animations())
          );
          for (const elapsed of [0, 100, 200, 400]) {
            if (elapsed > 0) {
              runFrame(2000 + elapsed);
            }
            shownScalars().forEach((shown, index) => {
              const start = starts[index].value;
              const end = ends[index].value;
              expect(shown).toBeCloseTo(
                start + ((end - start) * elapsed) / DURATION,
                6
              );
            });
          }
          manager.stop(FRAME_TAG);
        }
      );

      test.each<[string, Operations, () => Operations]>([
        [
          'radians to degrees',
          [{ rotate: '0rad' }],
          () => [{ rotate: move('90deg') }],
        ],
        [
          'a number to degrees',
          [{ rotate: 0 }],
          () => [{ rotate: move('90deg') }],
        ],
        [
          'degrees to a number',
          [{ rotate: '0deg' }],
          () => [{ rotate: move(90) }],
        ],
        [
          'an angle with another unit',
          [{ rotate: '0turn' }],
          () => [{ rotate: move('1turn') }],
        ],
        [
          'a translation in percent',
          [{ translateX: '0%' }],
          () => [{ translateX: move('50%') }],
        ],
        ['no initial value', [], () => [{ rotate: move(1) }]],
        [
          'an initial value of another operation',
          [{ rotateX: 0 }],
          () => [{ rotate: move(1) }],
        ],
        [
          'two keys in one operation',
          [{ scaleX: 1, scaleY: 1 }],
          () => [{ scaleX: move(2), scaleY: move(2) }],
        ],
        [
          'a matrix',
          [{ matrix: [1, 0, 0, 1, 0, 0] }],
          () => [{ matrix: move(1) }],
        ],
      ])('%s has no native values', (_, initial, animations) => {
        const { leaf } = leafOf(transformOf(initial, animations()));
        expect(leaf.initialValue).toBeUndefined();
        expect(leaf.track).toBeUndefined();
      });

      test.each<[string, () => Operations]>([
        [
          'two durations',
          () => [{ rotate: move(1) }, { translateX: move(10, 200) }],
        ],
        [
          'a delay on one operation',
          () => [
            { rotate: move(1) },
            {
              translateX: onUIRuntime(() =>
                withDelay(100, move(10) as unknown as number)
              ),
            },
          ],
        ],
        [
          'a second easing',
          () => [
            { rotate: move(1) },
            {
              translateX: onUIRuntime(() =>
                withTiming(10, { duration: DURATION, easing: Easing.ease })
              ),
            },
          ],
        ],
        [
          'an operation that does not change, with another duration',
          () => [{ rotate: move(1) }, { translateX: move(0, 800) }],
        ],
        [
          'a spring',
          () => [
            { rotate: move(1) },
            { translateX: onUIRuntime(() => withSpring(10)) },
          ],
        ],
      ])('%s: the leaf has values and no track', (_, animations) => {
        const { leaf } = leafOf(
          transformOf([{ rotate: 0 }, { translateX: 0 }], animations())
        );
        expect(operationsOf(leaf.initialValue).length).toBe(2);
        expect(leaf.track).toBeUndefined();
      });

      test.each<[string, unknown, number | string, unknown[]]>([
        ['radians to degrees', '0rad', '90deg', ['0rad', '45rad', '90rad']],
        ['degrees to a number', '0deg', 90, ['0deg', '45deg', '90deg']],
        ['a number to degrees', 0, '90deg', [null, null, '90deg']],
      ])(
        'the frame driver gives %s the unit of the initial value',
        (_, initial, toValue, shown) => {
          startBatchAt(2000);
          manager.start(
            FRAME_TAG,
            LayoutAnimationType.LAYOUT,
            {},
            transformOf([{ rotate: initial }], [{ rotate: move(toValue) }])
          );
          const rotations = [0, 200, 400].map((elapsed) => {
            if (elapsed > 0) {
              runFrame(2000 + elapsed);
            }
            return JSON.parse(JSON.stringify(lastProgress())).transform[0]
              .rotate;
          });
          expect(rotations).toEqual(shown);
          manager.stop(FRAME_TAG);
        }
      );

      test('a leaf with more operations than the limit has no summary and keeps its plain values', () => {
        const animations = [
          { rotate: 1 },
          { translateX: 10 },
          { translateY: 10 },
          { scaleX: 2 },
          { scaleY: 2 },
        ];
        const summary = manager.build(
          33,
          {},
          transformOf(animations, animations),
          { leaves: 6, transformOperations: 4 },
          []
        );
        manager.releaseBuilt(33);
        expect(summary).toMatchObject({ exceedsLimit: true, leaves: [] });
        expect(animations[0].rotate).toBe(1);
      });

      test('one delay on each operation is the delay of the leaf', () => {
        const delayed = (toValue: number) =>
          onUIRuntime(() => withDelay(100, move(toValue) as unknown as number));
        const { leaf } = leafOf(
          transformOf(
            [{ rotate: 0 }, { translateX: 0 }],
            [{ rotate: delayed(1) }, { translateX: delayed(10) }]
          )
        );
        expect(leaf.track).toMatchObject({
          durationMs: DURATION,
          delayMs: 100,
        });
      });

      test('a leaf of plain values has a track with no duration', () => {
        const { leaf } = leafOf(
          transformOf(
            [{ rotate: 0 }, { translateX: 0 }],
            [{ rotate: 1 }, { translateX: 10 }]
          )
        );
        expect(leaf).toMatchObject({
          initialValue: [
            { kind: 'rotate', value: 1 },
            { kind: 'translateX', value: 10 },
          ],
          track: { durationMs: 0, delayMs: 0 },
        });
      });

      describe('with a native track', () => {
        const liveConfig = (rotate: [unknown, number | string]) =>
          transformOf(
            [{ rotate: rotate[0] }, { translateX: 0 }],
            [{ rotate: move(rotate[1]) }, { translateX: move(100) }]
          );
        const NUMBERS: [unknown, number | string] = [0, 2];
        const DEGREES: [unknown, number | string] = ['0deg', '90deg'];
        const buildLive = (rotate = NUMBERS) => {
          startBatchAt(1000);
          manager.build(T.buildId, {}, liveConfig(rotate), LIMITS, []);
          startBatchAt(1100);
        };

        afterEach(() => {
          manager.stop(FRAME_TAG);
          manager.releaseBuilt(T.buildId);
        });

        test('the capture gives each operation at the batch time', () => {
          buildLive();
          expect(manager.captureLiveLeaves([T])).toEqual({
            transform: [{ rotate: 0.5 }, { translateX: 25 }],
          });
        });

        test('the capture keeps the unit of an angle', () => {
          buildLive(DEGREES);
          expect(manager.captureLiveLeaves([T])).toEqual({
            transform: [{ rotate: '22.5deg' }, { translateX: 25 }],
          });
        });

        const relations: [string, () => Operations, boolean, boolean][] = [
          [
            'the same end values and timing',
            () => [{ rotate: move(2) }, { translateX: move(100) }],
            true,
            false,
          ],
          [
            'other end values',
            () => [{ rotate: move(1) }, { translateX: move(50) }],
            false,
            false,
          ],
          [
            'one other end value',
            () => [{ rotate: move(2) }, { translateX: move(50) }],
            false,
            true,
          ],
          [
            'the same end values and another duration',
            () => [{ rotate: move(2, 200) }, { translateX: move(100, 200) }],
            false,
            true,
          ],
          [
            'a plain value beside the same end value',
            () => [{ rotate: move(2) }, { translateX: 100 }],
            false,
            true,
          ],
          [
            'another operation',
            () => [{ rotateX: move(2) }, { translateX: move(100) }],
            false,
            true,
          ],
          ['one operation less', () => [{ rotate: move(2) }], false, true],
        ];
        test.each(relations)(
          'a new leaf with %s: continues %s, needs the frame driver %s',
          (_, animations, continuesLiveLeaf, needsFrameDriver) => {
            buildLive();
            const summary = leafOf(
              transformOf([{ rotate: 0.5 }, { translateX: 25 }], animations()),
              [T]
            );
            expect(summary.needsFrameDriver).toBe(needsFrameDriver);
            expect(summary.leaf.continuesLiveLeaf).toBe(continuesLiveLeaf);
          }
        );

        test('an absent leaf continues a live leaf of numbers and needs the frame driver for an angle with a unit', () => {
          const next = () => configOf({ originY: 0 }, { originY: move(40) });
          buildLive();
          expect(leafOf(next(), [T]).needsFrameDriver).toBe(false);
          manager.releaseBuilt(T.buildId);
          buildLive(DEGREES);
          expect(leafOf(next(), [T]).needsFrameDriver).toBe(true);
        });

        test('a new leaf with the same angle in degrees replaces the live leaf', () => {
          buildLive(DEGREES);
          const summary = leafOf(
            transformOf(
              [{ rotate: '22.5deg' }, { translateX: 25 }],
              [{ rotate: move('90deg') }, { translateX: move(50) }]
            ),
            [T]
          );
          expect(summary.needsFrameDriver).toBe(false);
          expect(summary.leaf.continuesLiveLeaf).toBe(false);
        });

        const laterStarts: [
          string,
          (rotate: typeof NUMBERS) => () => LayoutAnimation,
        ][] = [
          [
            'no transform leaf',
            () => configOf({ originY: 0 }, { originY: move(40, 100) }),
          ],
          [
            'the same end values',
            ([start, end]) =>
              transformOf(
                [{ rotate: start === 0 ? 0.5 : '22.5deg' }, { translateX: 25 }],
                [{ rotate: move(end) }, { translateX: move(100) }]
              ),
          ],
          [
            'one other end value',
            ([start, end]) =>
              transformOf(
                [{ rotate: start === 0 ? 0.5 : '22.5deg' }, { translateX: 25 }],
                [{ rotate: move(end) }, { translateX: move(-50, 200) }]
              ),
          ],
        ];
        for (const [unitName, rotate] of [
          ['numbers', NUMBERS],
          ['degrees', DEGREES],
        ] as const) {
          test.each(laterStarts)(
            `${unitName}: a frame-driven start with %s gives the frames of the frame driver alone`,
            (_, next) => {
              const framesOf = (startNext: () => void) => {
                const shown = [];
                startNext();
                shown.push(lastProgress());
                for (const timestamp of [1150, 1200, 1300, 1500]) {
                  runFrame(timestamp);
                  shown.push(lastProgress());
                }
                manager.stop(FRAME_TAG);
                return JSON.parse(JSON.stringify(shown));
              };

              buildLive(rotate);
              const transferred = framesOf(() => {
                manager.build(34, {}, next(rotate), LIMITS, [T]);
                manager.startBuilt(FRAME_TAG, LayoutAnimationType.LAYOUT, 34, [
                  T,
                ]);
              });

              startBatchAt(1000);
              manager.start(
                FRAME_TAG,
                LayoutAnimationType.LAYOUT,
                {},
                liveConfig(rotate)
              );
              runFrame(1100);
              startBatchAt(1100);
              const frameDriven = framesOf(() =>
                manager.start(
                  FRAME_TAG,
                  LayoutAnimationType.LAYOUT,
                  {},
                  next(rotate)
                )
              );

              expect(transferred).toEqual(frameDriven);
            }
          );
        }

        test('the frame driver keeps the timeline of a number for the same end value and starts an angle with a unit again', () => {
          const rotationsAfterRestart = (rotate: typeof NUMBERS) => {
            startBatchAt(1000);
            manager.start(
              FRAME_TAG,
              LayoutAnimationType.LAYOUT,
              {},
              liveConfig(rotate)
            );
            runFrame(1100);
            startBatchAt(1100);
            manager.start(
              FRAME_TAG,
              LayoutAnimationType.LAYOUT,
              {},
              laterStarts[1][1](rotate)
            );
            runFrame(1200);
            const rotation = shownScalars()[0];
            manager.stop(FRAME_TAG);
            return rotation;
          };
          // The first timeline gives one half of the way at 1200.
          expect(rotationsAfterRestart(NUMBERS)).toBeCloseTo(1, 6);
          expect(rotationsAfterRestart(DEGREES)).toBeCloseTo(
            (22.5 + 67.5 / 4) * DEGREE,
            6
          );
        });
      });
    });
  });
});
