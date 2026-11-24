'use strict';

import type { ShareableHost } from 'react-native-worklets';
import { runOnUISync } from 'react-native-worklets';

import type { StyleLayoutAnimation } from '../animation';
import { cancelAnimation, withStyleAnimation } from '../animation';
import { isValidLayoutAnimationProp } from '../animation/util';
import { logger } from '../common';
import type {
  LayoutAnimation,
  LayoutAnimationsManager,
  LayoutAnimationValues,
  Mutable,
  SharedValue,
  Timestamp,
} from '../commonTypes';
import { LayoutAnimationType } from '../commonTypes';
import { getStaticFeatureFlag } from '../featureFlags';
import { mutableHostDecorator } from '../mutablesCommon';

const TAG_OFFSET = 1e9;
const FRAME_DURATION = 1000 / 60;
// Android moves the start of an animator whose first frame is two frames late.
const MIN_BLOCKED_TIME = 2 * FRAME_DURATION;

type LayoutAnimationStart = {
  timestamp: Timestamp;
  realTime: number;
  blockedTime?: number;
};

type LayoutAnimationTimeline = {
  startTimestamp: Timestamp;
  timeShift: number;
};

// The first frame after a start can carry a timestamp from before the block,
// so the block is measured on the clock. Real time caps it because the clock
// can be scaled (slow animations) or frozen (tests).
function measureBlockedTime(start: LayoutAnimationStart) {
  'worklet';
  const realBlockedTime = performance.now() - start.realTime;
  if (realBlockedTime < MIN_BLOCKED_TIME) {
    return 0;
  }
  const clockBlockedTime = global._getAnimationTimestamp() - start.timestamp;
  return Math.max(
    0,
    Math.min(realBlockedTime, clockBlockedTime) - FRAME_DURATION
  );
}

// The start can run in a mount that blocks the main thread for longer than
// the animation. That time does not count, except for one frame. A retarget
// keeps the time shift of the animation it continues, because it keeps that
// animation's start times.
function shiftFrames(
  animation: StyleLayoutAnimation,
  start: LayoutAnimationStart,
  startTimestamp: Timestamp,
  previousTimeShift: number,
  timelines: WeakMap<object, LayoutAnimationTimeline>
) {
  'worklet';
  const onFrame = animation.onFrame;
  const timeline = { startTimestamp, timeShift: previousTimeShift };
  timelines.set(animation, timeline);
  let timeShift: number | undefined;
  animation.onFrame = (self, timestamp) => {
    if (timeShift === undefined) {
      start.blockedTime ??= measureBlockedTime(start);
      timeShift = previousTimeShift + start.blockedTime;
      timeline.timeShift = timeShift;
    }
    return onFrame(self, Math.max(startTimestamp, timestamp - timeShift));
  };
}

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

function warnAboutUnsupportedProps(animations: Record<string, unknown>) {
  'worklet';
  for (const propName in animations) {
    if (!isValidLayoutAnimationProp(propName.trim())) {
      logger.warn(
        `'${propName}' property is not officially supported for layout animations. It may not work as expected.`
      );
    }
  }
}

function createLayoutAnimationManager(): LayoutAnimationsManager {
  'worklet';
  const currentAnimationForTag = new Map();
  const mutableValuesForTag = new Map();
  const timelines = new WeakMap<object, LayoutAnimationTimeline>();

  // Layout animation starts are scheduled separately on the UI runtime. With
  // a large number of views, sampling the clock for every start noticeably
  // staggers animations which belong to the same frame. Cache the first start
  // until the frame finalizers run so the whole batch shares one timeline.
  let layoutAnimationStart: LayoutAnimationStart | undefined;
  const getLayoutAnimationStart = () => {
    if (layoutAnimationStart === undefined) {
      layoutAnimationStart = {
        timestamp: global._getAnimationTimestamp(),
        realTime: performance.now(),
      };
      globalThis.requestAnimationFrameFinalizer(() => {
        layoutAnimationStart = undefined;
      });
    }
    return layoutAnimationStart;
  };

  // Flush layout-animation progress once per frame via the frame finalizer
  // (after all `requestAnimationFrame` callbacks), reusing the same
  // `_maybeFlushUIUpdatesQueue` path as animated-prop updates.
  // The mapper run is requested on demand, so its finalizer can sit before or
  // after this one. Running the mappers here first lets a mapper-driven
  // animation in the same frame flush together with the layout-animation
  // updates, so the mapper finalizer that follows is a no-op.
  // The backend drives its own flush from `runGrandCallback`, so this is non-backend only.
  let flushRequested = false;
  const scheduleFlush = () => {
    if (USE_ANIMATION_BACKEND || flushRequested) {
      return;
    }
    flushRequested = true;
    globalThis.requestAnimationFrameFinalizer(() => {
      flushRequested = false;
      global.__mapperRun?.();
      global._maybeFlushUIUpdatesQueue();
    });
  };

  const stop = (tag: number) => {
    const value = mutableValuesForTag.get(tag);
    if (!value) {
      return;
    }
    // native already made its cleanup, so we just do cleanup here on JS side
    value.removeListener(tag + TAG_OFFSET);
    try {
      cancelAnimation(value);
    } finally {
      currentAnimationForTag.delete(tag);
      mutableValuesForTag.delete(tag);
    }
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
      try {
        const style = config(yogaValues);
        if (__DEV__ && type !== LayoutAnimationType.SHARED_ELEMENT_TRANSITION) {
          warnAboutUnsupportedProps(style.animations);
        }
        let currentAnimation = style.animations;

        // When layout animation is requested, but a previous one is still running, we merge
        // new layout animation targets into the ongoing animation
        const previousAnimation = currentAnimationForTag.get(tag);
        if (
          previousAnimation &&
          type !== LayoutAnimationType.SHARED_ELEMENT_TRANSITION
        ) {
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

        const animation = withStyleAnimation(
          currentAnimation,
          (finished) => {
            if (finished) {
              currentAnimationForTag.delete(tag);
              mutableValuesForTag.delete(tag);
              const shouldRemoveView = type === LayoutAnimationType.EXITING;
              stopObservingProgress(
                tag,
                value,
                scheduleFlush,
                shouldRemoveView
              );
            }
            if (style.callback) {
              style.callback(finished);
            }
          },
          type === LayoutAnimationType.EXITING
        );

        startObservingProgress(tag, value, scheduleFlush);
        const previousFrameTimestamp = global.__frameTimestamp;
        // A start inside a frame does not run in a mount.
        const start =
          previousFrameTimestamp === undefined
            ? getLayoutAnimationStart()
            : {
                timestamp: previousFrameTimestamp,
                realTime: 0,
                blockedTime: 0,
              };
        const previous = value._animation && timelines.get(value._animation);
        const previousTimeShift = previous ? previous.timeShift : 0;
        // A retarget in a frame with a stale timestamp must not start before
        // the animation it continues.
        const startTimestamp =
          previous && previousTimeShift > 0
            ? Math.max(
                previous.startTimestamp,
                start.timestamp - previousTimeShift
              )
            : start.timestamp;
        global.__frameTimestamp = startTimestamp;
        try {
          value.value = animation;
        } finally {
          global.__frameTimestamp = previousFrameTimestamp;
        }
        shiftFrames(
          animation,
          start,
          startTimestamp,
          previousTimeShift,
          timelines
        );
      } catch (error) {
        try {
          stop(tag);
        } catch {
          throw error;
        }
        throw error;
      }
    },
    stop,
  };
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
