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

  describe('native build bookkeeping', () => {
    function makeBuildConfig({
      callback,
      properties = ['originX'],
    }: {
      callback?: (finished?: boolean) => void;
      properties?: string[];
    } = {}) {
      let runs = 0;
      const config = (): LayoutAnimation => {
        runs += 1;
        const initialValues: Record<string, number> = {};
        const animations: Record<string, unknown> = {};
        for (const property of properties) {
          initialValues[property] = 0;
          const animation: AnimationObject = {
            current: 1,
            onStart(started: AnimationObject) {
              started.current = 0;
            },
            onFrame(active: AnimationObject) {
              active.current = 1;
              return true;
            },
          };
          animations[property] = animation;
        }
        return {
          initialValues,
          animations: animations as LayoutAnimation['animations'],
          callback,
        };
      };
      return { config, runs: () => runs };
    }

    test('runs the builder once and reuses the build on the frame-driven start', () => {
      const { config, runs } = makeBuildConfig();

      const summary = manager.build!(
        10,
        LayoutAnimationType.LAYOUT,
        {},
        config,
        1,
        32
      );

      expect(summary).toEqual({
        properties: [{ property: 'originX', initialValue: 0, node: undefined }],
        hasUnanimatedInitialValues: false,
      });
      expect(runs()).toBe(1);

      manager.start(10, LayoutAnimationType.LAYOUT, {}, config, 1);

      expect(runs()).toBe(1);
    });

    test('fires the stored callback exactly once on the terminal result', () => {
      const callback = jest.fn();
      const { config } = makeBuildConfig({ callback });

      manager.build!(11, LayoutAnimationType.LAYOUT, {}, config, 2, 32);
      manager.completeNativeBuild!(11, 2, true);
      manager.completeNativeBuild!(11, 2, true);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(true);
    });

    test('settles a rejected frame-driven claim with callback(false)', () => {
      const callback = jest.fn();
      const { config, runs } = makeBuildConfig({ callback });

      manager.build!(12, LayoutAnimationType.LAYOUT, {}, config, 3, 32);
      manager.completeNativeBuild!(12, 3, false);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(false);
      expect(runs()).toBe(1);
    });

    test('keeps concurrent builds for one tag apart', () => {
      const { config, runs } = makeBuildConfig();

      manager.build!(13, LayoutAnimationType.LAYOUT, {}, config, 4, 32);
      manager.build!(13, LayoutAnimationType.LAYOUT, {}, config, 5, 32);
      manager.start(13, LayoutAnimationType.LAYOUT, {}, config, 4);
      manager.start(13, LayoutAnimationType.LAYOUT, {}, config, 5);

      expect(runs()).toBe(2);
    });

    test('keeps no build when the summary construction throws', () => {
      const callback = jest.fn();
      const malformedConfig = (): LayoutAnimation => ({
        initialValues: { originX: 0 },
        animations: undefined as unknown as LayoutAnimation['animations'],
        callback,
      });
      const { config, runs } = makeBuildConfig();

      expect(() =>
        manager.build!(
          15,
          LayoutAnimationType.LAYOUT,
          {},
          malformedConfig,
          7,
          32
        )
      ).toThrow();

      // No entry exists for the failed build, so the start runs its builder.
      manager.start(15, LayoutAnimationType.LAYOUT, {}, config, 7);
      expect(runs()).toBe(1);

      manager.completeNativeBuild!(15, 7, false);
      expect(callback).not.toHaveBeenCalled();
    });

    test('reports the resource limit without per-property work and keeps the build', () => {
      const { config, runs } = makeBuildConfig({
        properties: ['originX', 'originY'],
      });

      const summary = manager.build!(
        14,
        LayoutAnimationType.LAYOUT,
        {},
        config,
        6,
        1
      );

      expect(summary).toEqual({ limitExceeded: true });

      manager.start(14, LayoutAnimationType.LAYOUT, {}, config, 6);

      expect(runs()).toBe(1);
    });
  });
});
