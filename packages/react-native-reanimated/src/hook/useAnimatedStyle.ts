'use strict';
import type { MutableRefObject } from 'react';
import { useEffect, useRef } from 'react';

import { initialUpdaterRun } from '../animation';
import type {
  AnimatedPropsAdapterFunction,
  AnimatedPropsAdapterWorklet,
  AnimatedStyle,
  AnimationObject,
  NestedObjectValues,
  SharedValue,
  StyleProps,
  Timestamp,
  WorkletFunction,
} from '../commonTypes';
import { isWorkletFunction } from '../commonTypes';
import { makeShareable, startMapper, stopMapper } from '../core';
import { ReanimatedError } from '../errors';
import { isJest, shouldBeUseWeb } from '../PlatformChecker';
import { processBoxShadow } from '../processBoxShadow';
import updateProps, { updatePropsJestWrapper } from '../UpdateProps';
import type { ViewDescriptorsSet } from '../ViewDescriptorsSet';
import { makeViewDescriptorsSet } from '../ViewDescriptorsSet';
import type {
  AnimatedStyleHandle,
  DefaultStyle,
  DependencyList,
  Descriptor,
  JestAnimatedStyleHandle,
} from './commonTypes';
import { useSharedValue } from './useSharedValue';
import {
  buildWorkletsHash,
  isAnimated,
  shallowEqual,
  validateAnimatedStyles,
} from './utils';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

interface AnimatedState {
  last: AnimatedStyle<any>;
  animations: AnimatedStyle<any>;
  isAnimationRunning: boolean;
  isAnimationCancelled: boolean;
}

interface AnimatedUpdaterData {
  initial: {
    value: AnimatedStyle<any>;
    updater: () => AnimatedStyle<any>;
  };
  remoteState: AnimatedState;
  viewDescriptors: ViewDescriptorsSet;
}

function prepareAnimation(
  frameTimestamp: number,
  animatedProp: AnimatedStyle<any>,
  lastAnimation: AnimatedStyle<any>,
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

function runAnimations(
  animation: AnimatedStyle<any>,
  timestamp: Timestamp,
  key: number | string,
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
        animation.callback && animation.callback(true /* finished */);
      }
    }
    /*
     * If `animation.current` is a boxShadow object, spread its properties into a new object
     * to avoid modifying the original reference. This ensures when `newValues` has a nested color prop, it stays unparsed
     * in rgba format, allowing the animation to run correctly.
     */
    if (forceCopyAnimation) {
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

function styleUpdater(
  viewDescriptors: SharedValue<Descriptor[]>,
  updater: WorkletFunction<[], AnimatedStyle<any>> | (() => AnimatedStyle<any>),
  state: AnimatedState,
  animationsActive: SharedValue<boolean>,
  isAnimatedProps = false
): void {
  'worklet';
  const animations = state.animations ?? {};
  const newValues = updater() ?? {};
  const oldValues = state.last;
  const nonAnimatedNewValues: StyleProps = {};

  let hasAnimations = false;
  let frameTimestamp: number | undefined;
  let hasNonAnimatedValues = false;
  if (typeof newValues.boxShadow === 'string') {
    processBoxShadow(newValues);
  }
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
    state.animations = [];

    if (!shallowEqual(oldValues, newValues)) {
      updateProps(viewDescriptors, newValues, isAnimatedProps);
    }
  }
  state.last = newValues;
}

function jestStyleUpdater(
  viewDescriptors: SharedValue<Descriptor[]>,
  updater: WorkletFunction<[], AnimatedStyle<any>> | (() => AnimatedStyle<any>),
  state: AnimatedState,
  animationsActive: SharedValue<boolean>,
  animatedStyle: MutableRefObject<AnimatedStyle<any>>,
  adapters: AnimatedPropsAdapterFunction[]
): void {
  'worklet';
  const animations: AnimatedStyle<any> = state.animations ?? {};
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

    const updates: AnimatedStyle<any> = {};
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
      updatePropsJestWrapper(viewDescriptors, updates, animatedStyle, adapters);
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
    state.animations = [];
  }

  // calculate diff
  state.last = newValues;

  if (!shallowEqual(oldValues, newValues)) {
    updatePropsJestWrapper(viewDescriptors, newValues, animatedStyle, adapters);
  }
}

// check for invalid usage of shared values in returned object
function checkSharedValueUsage(
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
    throw new ReanimatedError(
      `Invalid value passed to \`${currentKey}\`, maybe you forgot to use \`.value\`?`
    );
  }
}

/**
 * Lets you create a styles object, similar to StyleSheet styles, which can be
 * animated using shared values.
 *
 * @param updater - A function returning an object with style properties you
 *   want to animate.
 * @param dependencies - An optional array of dependencies. Only relevant when
 *   using Reanimated without the Babel plugin on the Web.
 * @returns An animated style object which has to be passed to the `style`
 *   property of an Animated component you want to animate.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle
 */
// You cannot pass Shared Values to `useAnimatedStyle` directly.
// @ts-expect-error This overload is required by our API.
export function useAnimatedStyle<Style extends DefaultStyle>(
  updater: () => Style,
  dependencies?: DependencyList | null
): Style;

export function useAnimatedStyle<Style extends DefaultStyle>(
  updater:
    | WorkletFunction<[], Style>
    | ((() => Style) & Record<string, unknown>),
  dependencies?: DependencyList | null,
  adapters?: AnimatedPropsAdapterWorklet | AnimatedPropsAdapterWorklet[] | null,
  isAnimatedProps = false
): AnimatedStyleHandle<Style> | JestAnimatedStyleHandle<Style> {
  const animatedUpdaterData = useRef<AnimatedUpdaterData | null>(null);
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
        `\`useAnimatedStyle\` was used without a dependency array or Babel plugin. Please explicitly pass a dependency array, or enable the Babel plugin.
For more, see the docs: \`https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support#web-without-the-babel-plugin\`.`
      );
    }
  }
  const adaptersArray = adapters
    ? Array.isArray(adapters)
      ? adapters
      : [adapters]
    : [];
  const adaptersHash = adapters ? buildWorkletsHash(adaptersArray) : null;
  const areAnimationsActive = useSharedValue<boolean>(true);
  const jestAnimatedStyle = useRef<Style>({} as Style);

  // build dependencies
  if (!dependencies) {
    dependencies = [...inputs, updater.__workletHash];
  } else {
    dependencies.push(updater.__workletHash);
  }
  adaptersHash && dependencies.push(adaptersHash);

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
    let updaterFn = updater;
    if (adapters) {
      updaterFn = (() => {
        'worklet';
        const newValues = updater();
        adaptersArray.forEach((adapter) => {
          adapter(newValues as Record<string, unknown>);
        });
        return newValues;
      }) as WorkletFunction<[], Style>;
    }

    if (isJest()) {
      fun = () => {
        'worklet';
        jestStyleUpdater(
          shareableViewDescriptors,
          updater,
          remoteState,
          areAnimationsActive,
          jestAnimatedStyle,
          adaptersArray
        );
      };
    } else {
      fun = () => {
        'worklet';
        styleUpdater(
          shareableViewDescriptors,
          updaterFn,
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

  checkSharedValueUsage(initial.value);

  const animatedStyleHandle = useRef<
    AnimatedStyleHandle<Style> | JestAnimatedStyleHandle<Style> | null
  >(null);

  if (!animatedStyleHandle.current) {
    animatedStyleHandle.current = isJest()
      ? { viewDescriptors, initial, jestAnimatedStyle }
      : { viewDescriptors, initial };
  }

  return animatedStyleHandle.current;
}
