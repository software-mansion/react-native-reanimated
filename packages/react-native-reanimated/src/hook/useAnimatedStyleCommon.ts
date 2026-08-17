'use strict';
import type { WorkletFunction } from 'react-native-worklets';

import type {
  AnimatedStyle,
  AnimationObject,
  NestedObjectValues,
  SharedValue,
  StyleProps,
  StyleUpdaterContainer,
  Timestamp,
} from '../commonTypes';
import { updateProps } from '../updateProps';
import type { ViewDescriptorsSet } from '../ViewDescriptorsSet';
import type { Descriptor } from './commonTypes';
import { isAnimated, shallowEqual } from './utils';

export interface AnimatedState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  last: AnimatedStyle<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animations: AnimatedStyle<any>;
  isAnimationRunning: boolean;
  isAnimationCancelled: boolean;
}

export interface AnimatedUpdaterData {
  initial: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: AnimatedStyle<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updater: () => AnimatedStyle<any>;
  };
  remoteState: AnimatedState;
  viewDescriptors: ViewDescriptorsSet;
  styleUpdaterContainer: StyleUpdaterContainer;
}

export function prepareAnimation(
  frameTimestamp: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animatedProp: AnimatedStyle<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lastAnimation: AnimatedStyle<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lastValue: AnimatedStyle<any>
): void {
  'worklet';
  if (Array.isArray(animatedProp)) {
    animatedProp.forEach((prop, index) => {
      prepareAnimation(
        frameTimestamp,
        prop,
        lastAnimation && lastAnimation[index],
        lastValue && lastValue[index]
      );
    });
    // return animatedProp;
  }
  if (typeof animatedProp === 'object' && animatedProp.onFrame) {
    const animation = animatedProp;

    let value = animation.current;
    if (lastValue !== undefined && lastValue !== null) {
      if (typeof lastValue === 'object') {
        if (lastValue.value !== undefined) {
          // previously it was a shared value
          value = lastValue.value;
        } else if (lastValue.onFrame !== undefined) {
          if (lastAnimation?.current !== undefined) {
            // it was an animation before, copy its state
            value = lastAnimation.current;
          } else if (lastValue?.current !== undefined) {
            // it was initialized
            value = lastValue.current;
          }
        }
      } else {
        // previously it was a plain value, just set it as starting point
        value = lastValue;
      }
    }

    animation.callStart = (timestamp: Timestamp) => {
      animation.onStart(animation, value, timestamp, lastAnimation);
    };
    animation.callStart(frameTimestamp);
    animation.callStart = null;
  } else if (typeof animatedProp === 'object') {
    // it is an object
    Object.keys(animatedProp).forEach((key) =>
      prepareAnimation(
        frameTimestamp,
        animatedProp[key],
        lastAnimation && lastAnimation[key],
        lastValue && lastValue[key]
      )
    );
  }
}

export function runAnimations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animation: AnimatedStyle<any>,
  timestamp: Timestamp,
  key: number | string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: AnimatedStyle<any>,
  animationsActive: SharedValue<boolean>,
  forceCopyAnimation?: boolean
): boolean {
  'worklet';
  if (!animationsActive.value) {
    return true;
  }
  if (Array.isArray(animation)) {
    result[key] = [];
    let allFinished = true;
    forceCopyAnimation = key === 'boxShadow';
    animation.forEach((entry, index) => {
      if (
        !runAnimations(
          entry,
          timestamp,
          index,
          result[key],
          animationsActive,
          forceCopyAnimation
        )
      ) {
        allFinished = false;
      }
    });
    return allFinished;
  } else if (typeof animation === 'object' && animation.onFrame) {
    let finished = true;
    if (!animation.finished) {
      if (animation.callStart) {
        animation.callStart(timestamp);
        animation.callStart = null;
      }
      finished = animation.onFrame(animation, timestamp);
      animation.timestamp = timestamp;
      if (finished) {
        animation.finished = true;
        animation.callback?.(true /* finished */);
      }
    }
    /*
     * If `animation.current` is a boxShadow object, spread its properties into a new object
     * to avoid modifying the original reference. This ensures when `newValues` has a nested color prop, it stays unparsed
     * in rgba format, allowing the animation to run correctly. Additionally we need to check if user animated the whole boxShadow object or only one of its properties.
     */
    if (forceCopyAnimation && typeof animation.current === 'object') {
      result[key] = { ...animation.current };
    } else {
      result[key] = animation.current;
    }
    return finished;
  } else if (typeof animation === 'object') {
    result[key] = {};
    let allFinished = true;
    Object.keys(animation).forEach((k) => {
      if (
        !runAnimations(
          animation[k],
          timestamp,
          k,
          result[key],
          animationsActive,
          forceCopyAnimation
        )
      ) {
        allFinished = false;
      }
    });
    return allFinished;
  } else {
    result[key] = animation;
    return true;
  }
}

export function styleUpdater(
  viewDescriptors: SharedValue<Descriptor[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updater: WorkletFunction<[], AnimatedStyle<any>> | (() => AnimatedStyle<any>),
  state: AnimatedState,
  animationsActive: SharedValue<boolean>,
  isAnimatedProps = false,
  forceUpdate?: boolean
): void {
  'worklet';
  const animations = state.animations ?? {};
  const newValues = updater() ?? {};
  const oldValues = state.last;
  const nonAnimatedNewValues: StyleProps = {};

  let hasAnimations = false;
  let frameTimestamp: number | undefined;
  let hasNonAnimatedValues = false;
  for (const key in newValues) {
    const value = newValues[key];
    if (isAnimated(value)) {
      frameTimestamp =
        global.__frameTimestamp || global._getAnimationTimestamp();
      prepareAnimation(frameTimestamp, value, animations[key], oldValues[key]);
      animations[key] = value;
      hasAnimations = true;
    } else {
      hasNonAnimatedValues = true;
      nonAnimatedNewValues[key] = value;
      delete animations[key];
    }
  }

  if (hasAnimations) {
    const frame = (timestamp: Timestamp) => {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const { animations, last, isAnimationCancelled } = state;
      if (isAnimationCancelled) {
        state.isAnimationRunning = false;
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: AnimatedStyle<any> = {};
      let allFinished = true;
      for (const propName in animations) {
        const finished = runAnimations(
          animations[propName],
          timestamp,
          propName,
          updates,
          animationsActive
        );
        if (finished) {
          /**
           * If the animated prop is an array, we need to directly set each
           * property (manually spread it). This prevents issues where the color
           * prop might be incorrectly linked with its `toValue` and `current`
           * states, causing abrupt transitions or 'jumps' in animation states.
           */
          if (Array.isArray(updates[propName])) {
            updates[propName].forEach((obj: StyleProps) => {
              for (const prop in obj) {
                if (!last[propName] || typeof last[propName] !== 'object') {
                  last[propName] = {};
                }
                last[propName][prop] = obj[prop];
              }
            });
          } else {
            last[propName] = updates[propName];
          }
          delete animations[propName];
        } else {
          allFinished = false;
        }
      }

      if (updates) {
        updateProps(viewDescriptors, updates, isAnimatedProps);
      }

      if (!allFinished) {
        requestAnimationFrame(frame);
      } else {
        state.isAnimationRunning = false;
      }
    };

    state.animations = animations;
    if (!state.isAnimationRunning) {
      state.isAnimationCancelled = false;
      state.isAnimationRunning = true;
      frame(frameTimestamp!);
    }

    if (hasNonAnimatedValues) {
      updateProps(viewDescriptors, nonAnimatedNewValues, isAnimatedProps);
    }
  } else {
    state.isAnimationCancelled = true;
    state.animations = [];

    if (!shallowEqual(oldValues, newValues) || forceUpdate) {
      updateProps(viewDescriptors, newValues, isAnimatedProps);
    }
  }
  state.last = newValues;
}

export function checkSharedValueUsage(
  prop: NestedObjectValues<AnimationObject>,
  currentKey?: string
): void {
  if (Array.isArray(prop)) {
    // if it's an array (i.ex. transform) validate all its elements
    for (const element of prop) {
      checkSharedValueUsage(element, currentKey);
    }
  } else if (
    typeof prop === 'object' &&
    prop !== null &&
    prop.value === undefined
  ) {
    // if it's a nested object, run validation for all its props
    for (const key of Object.keys(prop)) {
      checkSharedValueUsage(prop[key], key);
    }
  } else if (
    currentKey !== undefined &&
    typeof prop === 'object' &&
    prop !== null &&
    prop.value !== undefined
  ) {
    // if shared value is passed instead of its value, throw an error
    throw new Error(
      `[Reanimated] Invalid value passed to \`${currentKey}\`, maybe you forgot to use \`.value\`?`
    );
  }
}

// Builds one big hash from multiple worklets' hashes.
export function buildWorkletsHash<Args extends unknown[], ReturnValue>(
  worklets:
    | Record<string, WorkletFunction<Args, ReturnValue>>
    | WorkletFunction<Args, ReturnValue>[]
) {
  // For arrays `Object.values` returns the array itself.
  return Object.values(worklets).reduce(
    (acc, worklet: WorkletFunction<Args, ReturnValue>) =>
      acc + worklet.__workletHash.toString(),
    ''
  );
}
