import '../src/layoutReanimation/animationsManager.native';

import type {
  AnimatableValue,
  AnimationObject,
  LayoutAnimation,
  Timestamp,
} from '../src/commonTypes';
import { LayoutAnimationType } from '../src/commonTypes';

jest.mock('react-native-worklets', () =>
  jest.requireActual('../../react-native-worklets/src/mock')
);

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
});
