'use strict';

import type { ShareableHost } from 'react-native-worklets';
import { runOnUISync } from 'react-native-worklets';

import { cancelAnimation, withStyleAnimation } from '../animation';
import type {
  AnimationObject,
  LayoutAnimation,
  LayoutAnimationsManager,
  LayoutAnimationValues,
  Mutable,
  NativeLayoutAnimationBuildSummary,
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

function stopObservingProgress(
  tag: number,
  sharedValue: SharedValue<number>,
  scheduleFlush: () => void,
  removeView = false
): void {
  'worklet';
  sharedValue.removeListener(tag + TAG_OFFSET);
  global._notifyAboutEnd(tag, removeView);
  scheduleFlush();
}

function createLayoutAnimationManager(): LayoutAnimationsManager {
  'worklet';
  const currentAnimationForTag = new Map();
  const mutableValuesForTag = new Map();
  // Builder results stored by the native route, keyed `tag:buildId`. Exactly
  // one later call consumes each entry: `start` with the same build id, or
  // `completeNativeBuild`. Per-build keys keep concurrent builds for one tag
  // apart, so a replacement cannot orphan a build or its callback.
  const nativeBuildForKey = new Map<string, LayoutAnimation>();

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
      config: (arg: Partial<LayoutAnimationValues>) => LayoutAnimation,
      buildId?: number
    ) {
      // Reuse the stored result of `build` instead of running the builder
      // again.
      let style: LayoutAnimation | undefined;
      if (buildId !== undefined) {
        const buildKey = `${tag}:${buildId}`;
        const storedBuild = nativeBuildForKey.get(buildKey);
        if (storedBuild) {
          nativeBuildForKey.delete(buildKey);
          style = storedBuild;
        }
      }
      style ??= config(yogaValues);
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
        stopObservingProgress(tag, value, scheduleFlush);
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
      global.__frameTimestamp ??= getLayoutAnimationStartTimestamp();
      value.value = animation;
      global.__frameTimestamp = previousFrameTimestamp;
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
    build(
      tag: number,
      _type: LayoutAnimationType,
      yogaValues: Partial<LayoutAnimationValues>,
      config: (arg: Partial<LayoutAnimationValues>) => LayoutAnimation,
      buildId: number,
      maxProperties: number
    ): NativeLayoutAnimationBuildSummary {
      const style = config(yogaValues);

      // Store the style only on a successful return; after a throw nothing
      // consumes the entry.
      const animations = style.animations as Record<string, unknown>;
      const animatedProperties = Object.keys(animations);
      // Report the resource limit before any per-property work.
      if (animatedProperties.length > maxProperties) {
        nativeBuildForKey.set(`${tag}:${buildId}`, style);
        return { limitExceeded: true };
      }
      const initialValues = (style.initialValues ?? {}) as Record<
        string,
        unknown
      >;
      let hasUnanimatedInitialValues = false;
      for (const key of Object.keys(initialValues)) {
        if (!(key in animations)) {
          hasUnanimatedInitialValues = true;
        }
      }
      const properties = animatedProperties.map((key) => {
        const animation = animations[key];
        const initialValue = initialValues[key];
        return {
          property: key,
          initialValue:
            typeof initialValue === 'number' ? initialValue : undefined,
          node:
            animation !== null &&
            typeof animation === 'object' &&
            !Array.isArray(animation)
              ? (animation as AnimationObject).__nativeAnimation
              : undefined,
        };
      });
      nativeBuildForKey.set(`${tag}:${buildId}`, style);
      return { properties, hasUnanimatedInitialValues };
    },
    completeNativeBuild(tag: number, buildId: number, finished: boolean) {
      const key = `${tag}:${buildId}`;
      const storedBuild = nativeBuildForKey.get(key);
      nativeBuildForKey.delete(key);
      storedBuild?.callback?.(finished);
    },
  };
}

// is-tree-shakable-suppress
runOnUISync(() => {
  'worklet';
  global.LayoutAnimationsManager = createLayoutAnimationManager();
});
