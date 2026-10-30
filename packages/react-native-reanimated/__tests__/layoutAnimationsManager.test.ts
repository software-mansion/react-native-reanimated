import type {
  AnimatableValue,
  AnimationObject,
  LayoutAnimation,
  Timestamp,
} from '../src/commonTypes';
import { LayoutAnimationType } from '../src/commonTypes';
import { initializeLayoutAnimationsManager } from '../src/layoutReanimation/animationsManager.native';

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

  describe('when an animation interrupts a running one', () => {
    const ANIMATION_DURATION = 100;
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    let frames: FrameRequestCallback[];

    // Animates linearly from the value it starts at to `toValue`
    function makeLinearAnimation(toValue: number) {
      let startValue = 0;
      let startTimestamp = 0;
      const animation: AnimationObject = {
        current: toValue,
        onStart(_animation, value, timestamp) {
          startValue = value as number;
          startTimestamp = timestamp;
          animation.current = startValue;
        },
        onFrame(_animation, timestamp) {
          const progress = Math.min(
            (timestamp - startTimestamp) / ANIMATION_DURATION,
            1
          );
          animation.current = startValue + (toValue - startValue) * progress;
          return progress === 1;
        },
      };
      // LayoutAnimation's public type describes resolved style values
      return animation as unknown as number;
    }

    // Starts an entering animation at 100 ms, and runs it until it's 40% done. The next
    // animation then starts at 140 ms.
    function startAndRunTo40Percent(
      tag: number,
      enteringAnimation: LayoutAnimation
    ) {
      getAnimationTimestamp.mockReturnValueOnce(100).mockReturnValueOnce(140);
      manager.start(
        tag,
        LayoutAnimationType.ENTERING,
        {},
        () => enteringAnimation
      );
      frameFinalizers.splice(0).forEach((finalizer) => finalizer());
      frames.splice(0).forEach((frame) => frame(140));
    }

    beforeEach(() => {
      frames = [];
      globalThis.requestAnimationFrame = (callback) => {
        frames.push(callback);
        return frames.length;
      };
    });

    afterEach(() => {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    });

    test('starts an exiting animation from the current values', () => {
      startAndRunTo40Percent(10, {
        initialValues: { opacity: 0 },
        animations: { opacity: makeLinearAnimation(1) },
      });

      manager.start(10, LayoutAnimationType.EXITING, {}, () => ({
        initialValues: { opacity: 1 },
        animations: { opacity: makeLinearAnimation(0) },
      }));

      expect(globalThis._notifyAboutProgress).toHaveBeenLastCalledWith(10, {
        opacity: 0.4,
      });
      manager.stop(10);
    });

    test('keeps the initial values that the interrupted animation does not drive', () => {
      startAndRunTo40Percent(11, {
        initialValues: { transform: [{ scale: 0 }] },
        animations: { transform: [{ scale: makeLinearAnimation(1) }] },
      });

      manager.start(11, LayoutAnimationType.EXITING, {}, () => ({
        initialValues: {
          opacity: 1,
          transform: [{ scale: 1 }, { translateX: 0 }],
        },
        animations: {
          opacity: makeLinearAnimation(0),
          transform: [
            { scale: makeLinearAnimation(0) },
            { translateX: makeLinearAnimation(100) },
          ],
        },
      }));

      expect(globalThis._notifyAboutProgress).toHaveBeenLastCalledWith(11, {
        opacity: 1,
        transform: [{ scale: 0.4 }, { translateX: 0 }],
      });
      manager.stop(11);
    });

    test('starts other animations from their initial values', () => {
      startAndRunTo40Percent(12, {
        initialValues: { opacity: 0 },
        animations: { opacity: makeLinearAnimation(1) },
      });

      manager.start(12, LayoutAnimationType.LAYOUT, {}, () => ({
        initialValues: { opacity: 1 },
        animations: { opacity: makeLinearAnimation(0) },
      }));

      expect(globalThis._notifyAboutProgress).toHaveBeenLastCalledWith(12, {
        opacity: 1,
      });
      manager.stop(12);
    });
  });
});
