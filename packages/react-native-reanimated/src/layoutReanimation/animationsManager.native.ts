'use strict';

import type { ShareableHost } from 'react-native-worklets';
import { runOnUISync } from 'react-native-worklets';

import { cancelAnimation, withStyleAnimation } from '../animation';
import type { EasingCurveFits } from '../animation/nativeEasingCurve';
import type {
  AnimationObject,
  LayoutAnimation,
  LayoutAnimationBuildSummary,
  LayoutAnimationsManager,
  LayoutAnimationValues,
  LiveLayoutLeaf,
  NativeLayoutLimits,
  NativeLayoutPlatformRules,
  NativeLeafTrack,
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
  hasMovingNonPlanarTransform,
  isTimingWithDuration,
  leverOf,
  relateToLiveLeaf,
  replayTimesOfLeaves,
  segmentCountOf,
  summarizeNativeLeaf,
  withReplacementLead,
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
  /**
   * The start of each leaf that starts at the captured value of the leaf that
   * it replaces: the replaced value at a later time (`replacementLeadMsOf`).
   */
  starts?: Record<string, { value: number; originMs: number }>;
  hasCallbackResult?: boolean;
};

/**
 * An estimate, from 60 fps videos of an iPhone: the screen shows the first
 * frame of a new native track this many refreshes after the refresh at or after
 * its command.
 */
const REPLACEMENT_LEAD_REFRESHES = 1;

/**
 * The proxy gives the builder the captured frame values as 32-bit floats
 * (`viewWithLiveLeafValues`).
 */
function startsAtCapturedValue(initialValue: unknown, liveValue: unknown) {
  'worklet';
  return (
    typeof initialValue === 'number' &&
    typeof liveValue === 'number' &&
    Math.fround(initialValue) === Math.fround(liveValue)
  );
}

/** Out of a frame callback the next refresh can be one period away. */
function replacementLeadMsOf({
  replacementLeadRefreshMs,
}: NativeLayoutPlatformRules): number {
  'worklet';
  const refreshes =
    REPLACEMENT_LEAD_REFRESHES +
    (global.__frameTimestamp === undefined ? 1 : 0);
  return refreshes * replacementLeadRefreshMs;
}

function jumpsAfterDelay(tracks: (NativeLeafTrack | undefined)[]): boolean {
  'worklet';
  return (
    tracks.length > 0 &&
    tracks.every((track) => track?.durationMs === 0) &&
    tracks.some((track) => (track?.delayMs ?? 0) > 0)
  );
}

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
      platformRules: NativeLayoutPlatformRules,
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
      const build: LayoutAnimationBuild = { style, originMs };
      builds.set(buildId, build);
      const animations = (style.animations ?? {}) as Record<string, unknown>;
      const initialValues = (style.initialValues ?? {}) as Record<
        string,
        unknown
      >;
      const keys = Object.keys(animations);
      const { transform } = animations;
      const refusalOf = (
        exceededLimit: keyof NativeLayoutLimits | null,
        refusedTarget: LayoutAnimationBuildSummary['refusedTarget'] = null
      ): LayoutAnimationBuildSummary => ({
        originMs,
        exceededLimit,
        refusedTarget,
        hasInitialOnlyKeys: false,
        jumpsAfterDelay: false,
        needsFrameDriver: false,
        leaves: [],
      });
      if (keys.length > limits.leaves) {
        return refusalOf('leaves');
      }
      if (
        Array.isArray(transform) &&
        transform.length > limits.transformOperations
      ) {
        return refusalOf('transformOperations');
      }
      if (
        platformRules.movesOnlyPlanarTransforms &&
        hasMovingNonPlanarTransform(initialValues.transform, transform)
      ) {
        return refusalOf(null, 'NonPlanarTransform');
      }
      animatePlainLeaves(animations);
      const relations: Record<string, LiveLeafRelation> = {};
      const liveValues: Record<string, unknown> = {};
      for (const liveLeaf of liveLeaves) {
        const live = advanceLiveLeaf(liveLeaf, originMs);
        relations[liveLeaf.key] = relateToLiveLeaf(
          live,
          animations[liveLeaf.key] as NativeLeaf | undefined
        );
        liveValues[liveLeaf.key] = currentOfNativeLeaf(live);
      }
      const needsFrameDriver = Object.values(relations).includes('frameDriver');
      const leadMs = needsFrameDriver ? 0 : replacementLeadMsOf(platformRules);
      build.starts = {};
      for (const liveLeaf of leadMs > 0 ? liveLeaves : []) {
        const { key } = liveLeaf;
        if (
          relations[key] === 'replaces' &&
          startsAtCapturedValue(initialValues[key], liveValues[key]) &&
          isTimingWithDuration(animations[key] as NativeLeaf)
        ) {
          const startMs = originMs + leadMs;
          build.starts[key] = {
            value: replacedValueAt(liveLeaf, startMs),
            originMs: startMs,
          };
        }
      }
      const fitting = { fits: easingCurveFits, lever: leverOf(yogaValues) };
      const summaries = keys.map((key) => {
        const start = build.starts?.[key];
        return {
          key,
          ...(start
            ? withReplacementLead(
                summarizeNativeLeaf(key, start.value, animations[key], fitting),
                initialValues[key] as number,
                leadMs
              )
            : summarizeNativeLeaf(
                key,
                initialValues[key],
                animations[key],
                fitting
              )),
        };
      });
      const segmentCount = summaries.reduce(
        (sum, { track }) => sum + (track ? segmentCountOf(track) : 0),
        0
      );
      if (segmentCount > limits.segments) {
        return refusalOf('segments');
      }
      return {
        originMs,
        exceededLimit: null,
        refusedTarget: null,
        hasInitialOnlyKeys: Object.keys(initialValues).some(
          (key) => !(key in animations)
        ),
        jumpsAfterDelay: jumpsAfterDelay(summaries.map(({ track }) => track)),
        needsFrameDriver,
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
      replayToStart(tag, build.style, build.originMs);
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
    pendingBuildCount() {
      return builds.size;
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

  /**
   * Gives the leaf in the state that the frame driver gives it at `now`. A leaf
   * with a later start has its start value before that start.
   */
  function advanceLiveLeaf(
    { buildId, key }: LiveLayoutLeaf,
    now: number
  ): NativeLeaf {
    const { style, originMs, starts } = builds.get(buildId)!;
    const leaf = (style!.animations as Record<string, NativeLeaf>)[key];
    const start = starts?.[key];
    if (start) {
      advanceNativeLeaf(
        leaf,
        start.value,
        start.originMs,
        Math.max(now, start.originMs)
      );
    } else {
      const initialValue = (style!.initialValues as Record<string, unknown>)[
        key
      ];
      advanceNativeLeaf(leaf, initialValue, originMs, now);
    }
    return leaf;
  }

  /**
   * The value of a scalar live leaf at `timeMs`. Each advance starts the leaf
   * again, so only its `finished` flag stays from this read; the read clears
   * it.
   */
  function replacedValueAt(liveLeaf: LiveLayoutLeaf, timeMs: number): number {
    const leaf = advanceLiveLeaf(liveLeaf, timeMs) as AnimationObject;
    const value = leaf.current as number;
    leaf.finished = false;
    return value;
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
   * A start after the origin of its build gets the frames that the frame driver
   * needs to reach the start on the timeline of the build: a delay starts its
   * animation in the frame of its end, and a spring moves no more than 64 ms in
   * one frame.
   */
  function replayToStart(
    tag: number,
    style: LayoutAnimation,
    originMs: number
  ) {
    const animation = mutableValuesForTag.get(tag)?._animation;
    if (!animation) {
      return;
    }
    const leaves = Object.values(style.animations) as NativeLeaf[];
    for (const replayTime of replayTimesOfLeaves(
      leaves,
      originMs,
      getStartTimestamp()
    )) {
      animation.onFrame(animation, replayTime);
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
