'use strict';

import type { ShareableHost } from 'react-native-worklets';
import { runOnUISync } from 'react-native-worklets';

import { cancelAnimation, withStyleAnimation } from '../animation';
import type {
  AnimationObject,
  LayoutAnimation,
  LayoutAnimationBuildSummary,
  LayoutAnimationsManager,
  LayoutAnimationValues,
  Mutable,
  SharedValue,
} from '../commonTypes';
import { LayoutAnimationType } from '../commonTypes';
import { getStaticFeatureFlag } from '../featureFlags';
import { mutableHostDecorator } from '../mutablesCommon';

const TAG_OFFSET = 1e9;

function makeMutableUI<TValue>(initial: TValue): Mutable<TValue> {
  'worklet';
  return mutableHostDecorator({
    value: initial,
  } as ShareableHost<TValue> & Mutable<TValue>);
}

const USE_ANIMATION_BACKEND = getStaticFeatureFlag('USE_ANIMATION_BACKEND');

function startObservingProgress(
  tag: number,
  sharedValue: SharedValue<Record<string, unknown>>,
  scheduleFlush: () => void
): void {
  'worklet';
  sharedValue.addListener(tag + TAG_OFFSET, () => {
    global._notifyAboutProgress(tag, sharedValue.value);
    scheduleFlush();
  });
}

function removeProgressListener(
  tag: number,
  sharedValue: SharedValue<number>
): void {
  'worklet';
  sharedValue.removeListener(tag + TAG_OFFSET);
}

function stopObservingProgress(
  tag: number,
  sharedValue: SharedValue<number>,
  scheduleFlush: () => void,
  removeView = false
): void {
  'worklet';
  removeProgressListener(tag, sharedValue);
  global._notifyAboutEnd(tag, removeView);
  scheduleFlush();
}

type LayoutAnimationBuild = {
  /** Absent when the builder threw `error`. */
  style?: LayoutAnimation;
  error?: unknown;
  originMs: number;
  hasCallbackResult?: boolean;
};

function summarizeLeaf(
  key: string,
  initialValue: unknown,
  animation: unknown
): LayoutAnimationBuildSummary['leaves'][number] {
  'worklet';
  const { reduceMotion, __nativeTiming } = (animation ?? {}) as AnimationObject;
  return {
    key,
    initialValue,
    timing: reduceMotion ? undefined : __nativeTiming,
  };
}

function createLayoutAnimationManager(): LayoutAnimationsManager {
  'worklet';
  const currentAnimationForTag = new Map();
  const mutableValuesForTag = new Map();
  const builds = new Map<number, LayoutAnimationBuild>();

  // Layout animation starts are scheduled separately on the UI runtime. With
  // a large number of views, sampling the clock for every start noticeably
  // staggers animations which belong to the same frame. Cache the first start
  // timestamp until the frame finalizers run so the whole batch shares one
  // timeline.
  let layoutAnimationStartTimestamp: number | undefined;
  const getLayoutAnimationStartTimestamp = () => {
    if (layoutAnimationStartTimestamp === undefined) {
      layoutAnimationStartTimestamp = global._getAnimationTimestamp();
      globalThis.requestAnimationFrameFinalizer(() => {
        layoutAnimationStartTimestamp = undefined;
      });
    }
    return layoutAnimationStartTimestamp;
  };

  // Flush layout-animation progress once per frame via the frame finalizer
  // (after all `requestAnimationFrame` callbacks), reusing the same
  // `_maybeFlushUIUpdatesQueue` path as animated-prop updates.
  // This finalizer runs after the mapper run (which re-queues itself a frame
  // ahead, so it sits earlier in the finalizer queue). When a mapper-driven
  // animation is also active, its flush runs first and already commits the
  // layout-animation updates too, so our `_maybeFlushUIUpdatesQueue` here is a
  // no-op; when only layout animations run, this is the single flush.
  // The backend drives its own flush from `runGrandCallback`, so this is non-backend only.
  let flushRequested = false;
  const scheduleFlush = () => {
    if (USE_ANIMATION_BACKEND || flushRequested) {
      return;
    }
    flushRequested = true;
    globalThis.requestAnimationFrameFinalizer(() => {
      flushRequested = false;
      global._maybeFlushUIUpdatesQueue();
    });
  };

  return {
    start(
      tag: number,
      type: LayoutAnimationType,
      /**
       * CreateLayoutAnimationManager creates an animation manager for Layout
       * animations.
       */
      yogaValues: Partial<LayoutAnimationValues>,
      config: (arg: Partial<LayoutAnimationValues>) => LayoutAnimation
    ) {
      startStyle(tag, type, config(yogaValues), getStartTimestamp());
    },
    build(
      buildId: number,
      yogaValues: Partial<LayoutAnimationValues>,
      config: (arg: Partial<LayoutAnimationValues>) => LayoutAnimation,
      maxLeaves: number
    ): LayoutAnimationBuildSummary | undefined {
      const originMs = getStartTimestamp();
      let style: LayoutAnimation;
      try {
        style = config(yogaValues);
      } catch (error) {
        builds.set(buildId, { error, originMs });
        return undefined;
      }
      builds.set(buildId, { style, originMs });
      const animations = (style.animations ?? {}) as Record<string, unknown>;
      const initialValues = (style.initialValues ?? {}) as Record<
        string,
        unknown
      >;
      const keys = Object.keys(animations);
      const exceedsLimit = keys.length > maxLeaves;
      return {
        originMs,
        exceedsLimit,
        hasInitialOnlyKeys: Object.keys(initialValues).some(
          (key) => !(key in animations)
        ),
        leaves: exceedsLimit
          ? []
          : keys.map((key) =>
              summarizeLeaf(key, initialValues[key], animations[key])
            ),
      };
    },
    startBuilt(tag: number, type: LayoutAnimationType, buildId: number) {
      const build = builds.get(buildId)!;
      builds.delete(buildId);
      if (!build.style) {
        throw build.error;
      }
      startStyle(tag, type, build.style, build.originMs);
    },
    finishBuilt(buildId: number, finished: boolean) {
      const build = builds.get(buildId);
      if (build && !build.hasCallbackResult) {
        build.hasCallbackResult = true;
        build.style?.callback?.(finished);
      }
    },
    releaseBuilt(buildId: number) {
      builds.delete(buildId);
    },
    stop(tag: number) {
      const value = mutableValuesForTag.get(tag);
      if (!value) {
        return;
      }
      // native already made its cleanup, so we just do cleanup here on JS side
      value.removeListener(tag + TAG_OFFSET);
      cancelAnimation(value);
      currentAnimationForTag.delete(tag);
      mutableValuesForTag.delete(tag);
    },
  };

  function getStartTimestamp(): number {
    return global.__frameTimestamp ?? getLayoutAnimationStartTimestamp();
  }

  function startStyle(
    tag: number,
    type: LayoutAnimationType,
    style: LayoutAnimation,
    startTimestamp: number
  ) {
    let currentAnimation = style.animations;

    // When layout animation is requested, but a previous one is still running, we merge
    // new layout animation targets into the ongoing animation
    const previousAnimation = currentAnimationForTag.get(tag);
    if (previousAnimation) {
      currentAnimation = { ...previousAnimation, ...style.animations };
    }
    currentAnimationForTag.set(tag, currentAnimation);

    let value = mutableValuesForTag.get(tag);
    if (value === undefined) {
      value = makeMutableUI(style.initialValues);
      mutableValuesForTag.set(tag, value);
    } else {
      removeProgressListener(tag, value);
      value._value = style.initialValues;
    }

    const animation = withStyleAnimation(currentAnimation, (finished) => {
      if (finished) {
        currentAnimationForTag.delete(tag);
        mutableValuesForTag.delete(tag);
        const shouldRemoveView = type === LayoutAnimationType.EXITING;
        stopObservingProgress(tag, value, scheduleFlush, shouldRemoveView);
      }
      if (style.callback) {
        style.callback(finished);
      }
    });

    startObservingProgress(tag, value, scheduleFlush);
    const previousFrameTimestamp = global.__frameTimestamp;
    global.__frameTimestamp = startTimestamp;
    value.value = animation;
    global.__frameTimestamp = previousFrameTimestamp;
  }
}

let isLayoutAnimationsManagerInitialized = false;

export function initializeLayoutAnimationsManager() {
  if (isLayoutAnimationsManagerInitialized) {
    return;
  }
  runOnUISync(() => {
    'worklet';
    global.LayoutAnimationsManager = createLayoutAnimationManager();
  });
  isLayoutAnimationsManagerInitialized = true;
}
