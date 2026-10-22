import { Easing, withDelay, withTiming } from '../src';
import type {
  AnimatableValue,
  AnimationObject,
  LayoutAnimation,
  Timestamp,
} from '../src/commonTypes';
import { LayoutAnimationType } from '../src/commonTypes';
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
      manager.build(buildId, {}, config, 3, []);

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
            __nativeTiming: { toValue: 9, delaysMs: [10, 20] },
          } as unknown as number,
          originY: {
            reduceMotion: true,
            __nativeTiming: {},
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
            timing: { toValue: 9, delayMs: 30 },
            continuesLiveLeaf: false,
          },
          { key: 'originY', initialValue: undefined },
        ],
      });
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

  describe('live leaves of native tracks', () => {
    const TAG = 20;
    const X = { buildId: 21, key: 'originX' };
    let frames: Array<(timestamp: number) => void>;
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

    const onUIRuntime = <T>(create: () => T): T => {
      const runtimeKind = globalThis.__RUNTIME_KIND;
      globalThis.__RUNTIME_KIND = 2;
      try {
        return create();
      } finally {
        globalThis.__RUNTIME_KIND = runtimeKind;
      }
    };
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
        3,
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
        3,
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
        3,
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
        3,
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
        3,
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
        3,
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
        3,
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
  });
});
