'use strict';
import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import type { WorkletFunction } from 'react-native-worklets';
import { isWorkletFunction, makeShareable } from 'react-native-worklets';

import { initialUpdaterRun } from '../animation';
import type { Maybe } from '../common';
import { IS_JEST, logger, ReanimatedError, SHOULD_BE_USE_WEB } from '../common';
import type {
  AnimatableValue,
  AnimatedPropsAdapterWorklet,
  AnimationObject,
  NestedObject,
  NestedObjectValues,
  SharedValue,
  Timestamp,
} from '../commonTypes';
import { startMapper, stopMapper } from '../core';
import type { AnyRecord, UnknownRecord } from '../css/types';
import { updateProps, updatePropsJestWrapper } from '../updateProps';
import type { ViewDescriptorsSet } from '../ViewDescriptorsSet';
import { makeViewDescriptorsSet } from '../ViewDescriptorsSet';
import type {
  AnimatedUpdaterHandle,
  AnimatedValuesUpdate,
  DependencyList,
  Descriptor,
  JestAnimatedUpdaterHandle,
} from './commonTypes';
import { useSharedValue } from './useSharedValue';
import { isAnimated, shallowEqual, validateAnimatedStyles } from './utils';

type AnimatedState = {
  last: AnimatedValuesUpdate;
  animations: NestedObject<AnimationObject>;
  isAnimationRunning: boolean;
  isAnimationCancelled: boolean;
};

type AnimatedUpdaterData<TValues extends object> = {
  initial: {
    value: TValues;
    updater: () => AnimatedValuesUpdate;
  };
  remoteState: AnimatedState;
  viewDescriptors: ViewDescriptorsSet;
};

function isAnimationObject(
  animation: NestedObjectValues<AnimationObject | AnimatableValue>
): animation is AnimationObject {
  'worklet';
  return (
    typeof animation === 'object' &&
    animation !== null &&
    'onFrame' in animation
  );
}

function prepareAnimation(
  frameTimestamp: number,
  animatedProp: NestedObjectValues<AnimationObject | AnimatableValue>,
  lastAnimation: NestedObjectValues<AnimationObject | AnimatableValue>,
  lastValue: NestedObjectValues<AnimationObject | AnimatableValue>
): void {
  'worklet';
  if (Array.isArray(animatedProp)) {
    animatedProp.forEach((prop, index) => {
      prepareAnimation(
        frameTimestamp,
        prop,
        lastAnimation?.[index],
        lastValue?.[index]
      );
    });
    // return animatedProp;
  }
  if (isAnimationObject(animatedProp)) {
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

function runAnimations(
  animations: NestedObjectValues<AnimationObject>,
  timestamp: Timestamp,
  key: number | string,
  result: NestedObjectValues<AnimatableValue>,
  animationsActive: SharedValue<boolean>,
  forceCopyAnimation?: boolean
): boolean {
  'worklet';
  if (!animationsActive.value) {
    return true;
  }

  const res = result as NestedObject<AnimatableValue>;

  if (Array.isArray(animations)) {
    res[key] = [];
    forceCopyAnimation = key === 'boxShadow';

    return animations.reduce(
      (allFinished, entry, index) =>
        allFinished &&
        runAnimations(
          entry,
          timestamp,
          index,
          res[key],
          animationsActive,
          forceCopyAnimation
        ),
      true
    );
  }

  if (isAnimationObject(animations)) {
    let finished = true;
    if (!animations.finished) {
      if (animations.callStart) {
        animations.callStart(timestamp);
        animations.callStart = null;
      }
      finished = animations.onFrame(animations, timestamp);
      animations.timestamp = timestamp;
      if (finished) {
        animations.finished = true;
        animations.callback?.(true /* finished */);
      }
    }
    /*
     * If `animation.current` is a boxShadow object, spread its properties into a new object
     * to avoid modifying the original reference. This ensures when `newValues` has a nested color prop, it stays unparsed
     * in rgba format, allowing the animation to run correctly.
     */
    if (forceCopyAnimation && typeof animations.current === 'object') {
      res[key] = { ...animations.current };
    } else {
      res[key] = animations.current!;
    }
    return finished;
  }

  if (typeof animations === 'object') {
    res[key] = {};
    let allFinished = true;
    Object.keys(animations).forEach((k) => {
      if (
        !runAnimations(
          animations[k],
          timestamp,
          k,
          res[key],
          animationsActive,
          forceCopyAnimation
        )
      ) {
        allFinished = false;
      }
    });
    return allFinished;
  }

  res[key] = animations;
  return true;
}

function styleUpdater(
  viewDescriptors: SharedValue<Descriptor[]>,
  updater: () => AnimatedValuesUpdate,
  state: AnimatedState,
  animationsActive: SharedValue<boolean>,
  isAnimatedProps: boolean
): void {
  'worklet';
  const animations = state.animations ?? {};
  const newValues = updater() ?? {};
  const oldValues = state.last;
  const nonAnimatedNewValues: UnknownRecord = {};

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

      const updates: AnimatedValuesUpdate = {};
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
            updates[propName].forEach((obj) => {
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
        updateProps(viewDescriptors, updates);
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
      updateProps(viewDescriptors, nonAnimatedNewValues);
    }
  } else {
    state.isAnimationCancelled = true;
    state.animations = {};

    if (!shallowEqual(oldValues, newValues)) {
      updateProps(viewDescriptors, newValues, isAnimatedProps);
    }
  }
  state.last = newValues;
}

function jestStyleUpdater<TValues extends object>(
  viewDescriptors: SharedValue<Descriptor[]>,
  updater: () => AnimatedValuesUpdate,
  state: AnimatedState,
  animationsActive: SharedValue<boolean>,
  animatedValues: RefObject<TValues>
): void {
  'worklet';
  const animations: NestedObject<AnimationObject> = state.animations ?? {};
  const newValues = updater() ?? {};
  const oldValues = state.last;

  // extract animated props
  let hasAnimations = false;
  let frameTimestamp: number | undefined;
  Object.keys(animations).forEach((key) => {
    const value = newValues[key];
    if (!isAnimated(value)) {
      delete animations[key];
    }
  });
  Object.keys(newValues).forEach((key) => {
    const value = newValues[key];
    if (isAnimated(value)) {
      frameTimestamp =
        global.__frameTimestamp || global._getAnimationTimestamp();
      prepareAnimation(frameTimestamp, value, animations[key], oldValues[key]);
      animations[key] = value;
      hasAnimations = true;
    }
  });

  function frame(timestamp: Timestamp) {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const { animations, last, isAnimationCancelled } = state;
    if (isAnimationCancelled) {
      state.isAnimationRunning = false;
      return;
    }

    const updates: AnimatedValuesUpdate = {};
    let allFinished = true;
    Object.keys(animations).forEach((propName) => {
      const finished = runAnimations(
        animations[propName],
        timestamp,
        propName,
        updates,
        animationsActive
      );
      if (finished) {
        last[propName] = updates[propName];
        delete animations[propName];
      } else {
        allFinished = false;
      }
    });

    if (Object.keys(updates).length) {
      updatePropsJestWrapper(viewDescriptors, updates, animatedValues);
    }

    if (!allFinished) {
      requestAnimationFrame(frame);
    } else {
      state.isAnimationRunning = false;
    }
  }

  if (hasAnimations) {
    state.animations = animations;
    if (!state.isAnimationRunning) {
      state.isAnimationCancelled = false;
      state.isAnimationRunning = true;
      frame(frameTimestamp!);
    }
  } else {
    state.isAnimationCancelled = true;
    state.animations = {};
  }

  // calculate diff
  state.last = newValues;

  if (!shallowEqual(oldValues, newValues)) {
    updatePropsJestWrapper(viewDescriptors, newValues, animatedValues);
  }
}

// check for invalid usage of shared values in returned object
function checkSharedValueUsage(
  prop: NestedObjectValues<SharedValue | AnimatableValue>,
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
      checkSharedValueUsage(
        (prop as NestedObject<SharedValue | AnimatableValue>)[key],
        key
      );
    }
  } else if (
    currentKey !== undefined &&
    typeof prop === 'object' &&
    prop !== null &&
    prop.value !== undefined
  ) {
    // if shared value is passed instead of its value, throw an error
    throw new ReanimatedError(
      `Invalid value passed to \`${currentKey}\`, maybe you forgot to use \`.value\`?`
    );
  }
}

export function useAnimatedUpdaterInternal<TValues extends AnyRecord>(
  hookName: string,
  updater:
    | WorkletFunction<[], TValues>
    | ((() => TValues) & Partial<WorkletFunction>),
  dependencies: Maybe<DependencyList>,
  adapters: Maybe<AnimatedPropsAdapterWorklet | AnimatedPropsAdapterWorklet[]>,
  isAnimatedProps: boolean
): AnimatedUpdaterHandle<TValues> | JestAnimatedUpdaterHandle<TValues> {
  const animatedUpdaterData = useRef<AnimatedUpdaterData<TValues>>(null);
  let inputs = Object.values(updater.__closure ?? {});

  if (SHOULD_BE_USE_WEB) {
    if (!inputs.length && dependencies?.length) {
      // let web work without a Babel plugin
      inputs = dependencies;
    }
    if (
      __DEV__ &&
      !inputs.length &&
      !dependencies &&
      !isWorkletFunction(updater)
    ) {
      throw new ReanimatedError(
        `\`${hookName}\` was used without a dependency array or Babel plugin. Please explicitly pass a dependency array, or enable the Babel plugin.
For more, see the docs: \`https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support#web-without-the-babel-plugin\`.`
      );
    }
  }

  if (adapters) {
    logger.warn(
      `The \`adapters\` parameter is no longer necessary in Reanimated 4 and will be removed in next version. Please remove this parameter from the \`${hookName}\` call and pass the adapter function directly.`
    );
  }

  const areAnimationsActive = useSharedValue(true);
  const jestAnimatedValues = useRef({} as TValues);

  // build dependencies
  if (!dependencies) {
    dependencies = [...inputs, updater.__workletHash];
  } else {
    dependencies.push(updater.__workletHash);
  }

  if (!animatedUpdaterData.current) {
    const initialStyle = initialUpdaterRun(updater);
    if (__DEV__) {
      validateAnimatedStyles(initialStyle);
    }
    animatedUpdaterData.current = {
      initial: {
        value: initialStyle,
        updater,
      },
      remoteState: makeShareable({
        last: initialStyle,
        animations: {},
        isAnimationCancelled: false,
        isAnimationRunning: false,
      }),
      viewDescriptors: makeViewDescriptorsSet(),
    };
  }

  const { initial, remoteState, viewDescriptors } = animatedUpdaterData.current;
  const shareableViewDescriptors = viewDescriptors.shareableViewDescriptors;

  dependencies.push(shareableViewDescriptors);

  useEffect(() => {
    let fun;

    if (IS_JEST) {
      fun = () => {
        'worklet';
        jestStyleUpdater(
          shareableViewDescriptors,
          updater,
          remoteState,
          areAnimationsActive,
          jestAnimatedValues
        );
      };
    } else {
      fun = () => {
        'worklet';
        styleUpdater(
          shareableViewDescriptors,
          updater,
          remoteState,
          areAnimationsActive,
          isAnimatedProps
        );
      };
    }
    const mapperId = startMapper(fun, inputs);
    return () => {
      stopMapper(mapperId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => {
    areAnimationsActive.value = true;
    return () => {
      areAnimationsActive.value = false;
    };
  }, [areAnimationsActive]);

  if (__DEV__) {
    checkSharedValueUsage(initial.value);
  }

  const animatedUpdaterHandle = useRef<
    AnimatedUpdaterHandle<TValues> | JestAnimatedUpdaterHandle<TValues>
  >(null);

  if (!animatedUpdaterHandle.current) {
    animatedUpdaterHandle.current = IS_JEST
      ? {
          viewDescriptors,
          initial,
          jestAnimatedValues,
          toJSON: animatedStyleHandleToJSON,
        }
      : { viewDescriptors, initial };
  }

  return animatedUpdaterHandle.current;
}

function animatedStyleHandleToJSON(): string {
  return '{}';
}
