'use strict';

import type { ShareableHost } from 'react-native-worklets';
import { runOnUISync } from 'react-native-worklets';

import { cancelAnimation, withStyleAnimation } from '../animation';
import type { EasingCurveFits } from '../animation/nativeEasingCurve';
import type {
  LayoutAnimation,
  LayoutAnimationBuildSummary,
  LayoutAnimationsManager,
  LayoutAnimationValues,
  LiveLayoutLeaf,
  NativeLayoutLimits,
  Mutable,
  SharedValue,
} from '../commonTypes';
import { LayoutAnimationType } from '../commonTypes';
import { getStaticFeatureFlag } from '../featureFlags';
import { mutableHostDecorator } from '../mutablesCommon';
import type { LiveLeafRelation, NativeLeaf } from './nativeLeaves';
import {
  advanceNativeLeaf,
  animatePlainLeaves,
  currentOfNativeLeaf,
  leverOf,
  phaseEndsOf,
  relateToLiveLeaf,
  summarizeNativeLeaf,
} from './nativeLeaves';

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

function createLayoutAnimationManager(): LayoutAnimationsManager {
  'worklet';
  const currentAnimationForTag = new Map();
  const mutableValuesForTag = new Map();
  const builds = new Map<number, LayoutAnimationBuild>();
  const easingCurveFits: EasingCurveFits = new WeakMap();

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
      limits: NativeLayoutLimits,
      liveLeaves: LiveLayoutLeaf[]
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
      const { transform } = animations;
      const refusal: LayoutAnimationBuildSummary = {
        originMs,
        exceedsLimit: true,
        hasInitialOnlyKeys: false,
        needsFrameDriver: false,
        leaves: [],
      };
      const hasTooManyLeaves =
        keys.length > limits.leaves ||
        (Array.isArray(transform) &&
          transform.length > limits.transformOperations);
      if (hasTooManyLeaves) {
        return refusal;
      }
      animatePlainLeaves(animations);
      const fitting = { fits: easingCurveFits, lever: leverOf(yogaValues) };
      const summaries = keys.map((key) => ({
        key,
        ...summarizeNativeLeaf(
          key,
          initialValues[key],
          animations[key],
          fitting
        ),
      }));
      const segmentCount = summaries.reduce(
        (sum, { track }) => sum + (track?.segments.length ?? 0),
        0
      );
      if (segmentCount > limits.segments) {
        return refusal;
      }
      const relations: Record<string, LiveLeafRelation> = {};
      for (const liveLeaf of liveLeaves) {
        relations[liveLeaf.key] = relateToLiveLeaf(
          advanceLiveLeaf(liveLeaf, originMs),
          animations[liveLeaf.key] as NativeLeaf | undefined
        );
      }
      return {
        originMs,
        exceedsLimit: false,
        hasInitialOnlyKeys: Object.keys(initialValues).some(
          (key) => !(key in animations)
        ),
        needsFrameDriver: Object.values(relations).includes('frameDriver'),
        leaves: summaries.map((summary) => ({
          ...summary,
          continuesLiveLeaf: relations[summary.key] === 'continues',
        })),
      };
    },
    captureLiveLeaves(liveLeaves: LiveLayoutLeaf[]): Record<string, unknown> {
      const now = getStartTimestamp();
      const values: Record<string, unknown> = {};
      for (const liveLeaf of liveLeaves) {
        values[liveLeaf.key] = currentOfNativeLeaf(
          advanceLiveLeaf(liveLeaf, now)
        );
      }
      return values;
    },
    startBuilt(
      tag: number,
      type: LayoutAnimationType,
      buildId: number,
      liveLeaves: LiveLayoutLeaf[]
    ) {
      const build = builds.get(buildId)!;
      builds.delete(buildId);
      if (liveLeaves.length > 0) {
        continueLiveLeaves(tag, liveLeaves, build.originMs);
      }
      if (!build.style) {
        throw build.error;
      }
      startStyle(tag, type, build.style, build.originMs);
      replayPhaseEnds(tag, build.style, build.originMs);
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

  /** Gives the leaf in the state that the frame driver gives it at `now`. */
  function advanceLiveLeaf(
    { buildId, key }: LiveLayoutLeaf,
    now: number
  ): NativeLeaf {
    const { style, originMs } = builds.get(buildId)!;
    const leaf = (style!.animations as Record<string, NativeLeaf>)[key];
    const initialValue = (style!.initialValues as Record<string, unknown>)[key];
    advanceNativeLeaf(leaf, initialValue, originMs, now);
    return leaf;
  }

  /**
   * Makes the live leaves the previous animation of the view, as if the frame
   * driver played them until now. Nothing runs them before the next start.
   */
  function continueLiveLeaves(
    tag: number,
    liveLeaves: LiveLayoutLeaf[],
    now: number
  ) {
    const animations: Record<string, NativeLeaf> = {};
    const values: Record<string, unknown> = {};
    for (const liveLeaf of liveLeaves) {
      const leaf = advanceLiveLeaf(liveLeaf, now);
      animations[liveLeaf.key] = leaf;
      values[liveLeaf.key] = currentOfNativeLeaf(leaf);
    }
    const value = makeMutableUI(values);
    value._animation = withStyleAnimation(animations);
    currentAnimationForTag.set(tag, animations);
    mutableValuesForTag.set(tag, value);
  }

  /**
   * A start after the origin of its build gets the frame of each phase end that
   * is over, as the frame driver ran it: a delay starts its animation in that
   * frame.
   */
  function replayPhaseEnds(
    tag: number,
    style: LayoutAnimation,
    originMs: number
  ) {
    const animation = mutableValuesForTag.get(tag)?._animation;
    const now = getStartTimestamp();
    const leaves = Object.values(style.animations) as NativeLeaf[];
    for (const phaseEnd of phaseEndsOf(leaves)) {
      if (!animation || originMs + phaseEnd >= now) {
        return;
      }
      animation.onFrame(animation, originMs + phaseEnd);
    }
  }

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
