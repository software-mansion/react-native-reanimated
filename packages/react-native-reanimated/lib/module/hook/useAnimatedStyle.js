'use strict';

import { useEffect, useRef } from 'react';
import { isWorkletFunction, makeShareable } from 'react-native-worklets';
import { initialUpdaterRun } from "../animation/index.js";
import { IS_JEST, ReanimatedError, SHOULD_BE_USE_WEB } from "../common/index.js";
import { startMapper, stopMapper } from "../core.js";
import { updateProps, updatePropsJestWrapper } from "../updateProps/index.js";
import { makeViewDescriptorsSet } from "../ViewDescriptorsSet.js";
import { useSharedValue } from "./useSharedValue.js";
import { buildWorkletsHash, isAnimated, shallowEqual, validateAnimatedStyles } from "./utils.js";
function prepareAnimation(frameTimestamp, animatedProp, lastAnimation, lastValue) {
  'worklet';

  if (Array.isArray(animatedProp)) {
    animatedProp.forEach((prop, index) => {
      prepareAnimation(frameTimestamp, prop, lastAnimation && lastAnimation[index], lastValue && lastValue[index]);
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
    animation.callStart = timestamp => {
      animation.onStart(animation, value, timestamp, lastAnimation);
    };
    animation.callStart(frameTimestamp);
    animation.callStart = null;
  } else if (typeof animatedProp === 'object') {
    // it is an object
    Object.keys(animatedProp).forEach(key => prepareAnimation(frameTimestamp, animatedProp[key], lastAnimation && lastAnimation[key], lastValue && lastValue[key]));
  }
}
function runAnimations(animation, timestamp, key, result, animationsActive, forceCopyAnimation) {
  'worklet';

  if (!animationsActive.value) {
    return true;
  }
  if (Array.isArray(animation)) {
    result[key] = [];
    let allFinished = true;
    forceCopyAnimation = key === 'boxShadow';
    animation.forEach((entry, index) => {
      if (!runAnimations(entry, timestamp, index, result[key], animationsActive, forceCopyAnimation)) {
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
     * in rgba format, allowing the animation to run correctly.
     */
    if (forceCopyAnimation) {
      result[key] = {
        ...animation.current
      };
    } else {
      result[key] = animation.current;
    }
    return finished;
  } else if (typeof animation === 'object') {
    result[key] = {};
    let allFinished = true;
    Object.keys(animation).forEach(k => {
      if (!runAnimations(animation[k], timestamp, k, result[key], animationsActive, forceCopyAnimation)) {
        allFinished = false;
      }
    });
    return allFinished;
  } else {
    result[key] = animation;
    return true;
  }
}
function styleUpdater(viewDescriptors, updater, state, animationsActive, isAnimatedProps = false, forceUpdate) {
  'worklet';

  const animations = state.animations ?? {};
  const newValues = updater() ?? {};
  const oldValues = state.last;
  const nonAnimatedNewValues = {};
  let hasAnimations = false;
  let frameTimestamp;
  let hasNonAnimatedValues = false;
  for (const key in newValues) {
    const value = newValues[key];
    if (isAnimated(value)) {
      frameTimestamp = global.__frameTimestamp || global._getAnimationTimestamp();
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
    const frame = timestamp => {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const {
        animations,
        last,
        isAnimationCancelled
      } = state;
      if (isAnimationCancelled) {
        state.isAnimationRunning = false;
        return;
      }
      const updates = {};
      let allFinished = true;
      for (const propName in animations) {
        const finished = runAnimations(animations[propName], timestamp, propName, updates, animationsActive);
        if (finished) {
          /**
           * If the animated prop is an array, we need to directly set each
           * property (manually spread it). This prevents issues where the color
           * prop might be incorrectly linked with its `toValue` and `current`
           * states, causing abrupt transitions or 'jumps' in animation states.
           */
          if (Array.isArray(updates[propName])) {
            updates[propName].forEach(obj => {
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
      frame(frameTimestamp);
    }
    if (hasNonAnimatedValues) {
      updateProps(viewDescriptors, nonAnimatedNewValues);
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
function jestStyleUpdater(viewDescriptors, updater, state, animationsActive, animatedValues, adapters, forceUpdate) {
  'worklet';

  const animations = state.animations ?? {};
  const newValues = updater() ?? {};
  const oldValues = state.last;

  // extract animated props
  let hasAnimations = false;
  let frameTimestamp;
  Object.keys(animations).forEach(key => {
    const value = newValues[key];
    if (!isAnimated(value)) {
      delete animations[key];
    }
  });
  Object.keys(newValues).forEach(key => {
    const value = newValues[key];
    if (isAnimated(value)) {
      frameTimestamp = global.__frameTimestamp || global._getAnimationTimestamp();
      prepareAnimation(frameTimestamp, value, animations[key], oldValues[key]);
      animations[key] = value;
      hasAnimations = true;
    }
  });
  function frame(timestamp) {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const {
      animations,
      last,
      isAnimationCancelled
    } = state;
    if (isAnimationCancelled) {
      state.isAnimationRunning = false;
      return;
    }
    const updates = {};
    let allFinished = true;
    Object.keys(animations).forEach(propName => {
      const finished = runAnimations(animations[propName], timestamp, propName, updates, animationsActive);
      if (finished) {
        last[propName] = updates[propName];
        delete animations[propName];
      } else {
        allFinished = false;
      }
    });
    if (Object.keys(updates).length) {
      updatePropsJestWrapper(viewDescriptors, updates, animatedValues, adapters);
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
      frame(frameTimestamp);
    }
  } else {
    state.isAnimationCancelled = true;
    state.animations = [];
  }

  // calculate diff
  state.last = newValues;
  if (!shallowEqual(oldValues, newValues) || forceUpdate) {
    updatePropsJestWrapper(viewDescriptors, newValues, animatedValues, adapters);
  }
}

// check for invalid usage of shared values in returned object
function checkSharedValueUsage(prop, currentKey) {
  if (Array.isArray(prop)) {
    // if it's an array (i.ex. transform) validate all its elements
    for (const element of prop) {
      checkSharedValueUsage(element, currentKey);
    }
  } else if (typeof prop === 'object' && prop !== null && prop.value === undefined) {
    // if it's a nested object, run validation for all its props
    for (const key of Object.keys(prop)) {
      checkSharedValueUsage(prop[key], key);
    }
  } else if (currentKey !== undefined && typeof prop === 'object' && prop !== null && prop.value !== undefined) {
    // if shared value is passed instead of its value, throw an error
    throw new ReanimatedError(`Invalid value passed to \`${currentKey}\`, maybe you forgot to use \`.value\`?`);
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

export function useAnimatedStyle(updater, dependencies, adapters, isAnimatedProps = false) {
  const animatedUpdaterData = useRef(null);
  let inputs = Object.values(updater.__closure ?? {});
  if (SHOULD_BE_USE_WEB) {
    if (!inputs.length && dependencies?.length) {
      // let web work without a Babel plugin
      inputs = dependencies;
    }
    if (__DEV__ && !inputs.length && !dependencies && !isWorkletFunction(updater)) {
      throw new ReanimatedError(`\`useAnimatedStyle\` was used without a dependency array or Babel plugin. Please explicitly pass a dependency array, or enable the Babel plugin.
For more, see the docs: \`https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support#web-without-the-babel-plugin\`.`);
    }
  }
  const adaptersArray = adapters ? Array.isArray(adapters) ? adapters : [adapters] : [];
  const adaptersHash = adapters ? buildWorkletsHash(adaptersArray) : null;
  const areAnimationsActive = useSharedValue(true);
  const jestAnimatedValues = useRef({});

  // build dependencies
  if (!dependencies) {
    dependencies = [...inputs, updater.__workletHash];
  } else {
    dependencies.push(updater.__workletHash);
  }
  if (adaptersHash) {
    dependencies.push(adaptersHash);
  }
  if (!animatedUpdaterData.current) {
    const initialStyle = initialUpdaterRun(updater);
    if (__DEV__) {
      validateAnimatedStyles(initialStyle);
    }
    animatedUpdaterData.current = {
      initial: {
        value: initialStyle,
        updater
      },
      remoteState: makeShareable({
        last: initialStyle,
        animations: {},
        isAnimationCancelled: false,
        isAnimationRunning: false
      }),
      viewDescriptors: makeViewDescriptorsSet(),
      styleUpdaterContainer: {
        current: undefined
      }
    };
  }
  const {
    initial,
    remoteState,
    viewDescriptors
  } = animatedUpdaterData.current;
  const shareableViewDescriptors = viewDescriptors.shareableViewDescriptors;
  dependencies.push(shareableViewDescriptors);
  useEffect(() => {
    let fun;
    let updaterFn = updater;
    if (adapters) {
      updaterFn = () => {
        'worklet';

        const newValues = updater();
        adaptersArray.forEach(adapter => {
          adapter(newValues);
        });
        return newValues;
      };
    }
    if (IS_JEST) {
      fun = forceUpdate => {
        'worklet';

        jestStyleUpdater(shareableViewDescriptors, updater, remoteState, areAnimationsActive, jestAnimatedValues, adaptersArray, forceUpdate);
      };
    } else {
      fun = forceUpdate => {
        'worklet';

        styleUpdater(shareableViewDescriptors, updaterFn, remoteState, areAnimationsActive, isAnimatedProps, forceUpdate);
      };
    }
    if (animatedUpdaterData.current) {
      animatedUpdaterData.current.styleUpdaterContainer.current = fun;
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
  const animatedStyleHandle = useRef(null);
  if (!animatedStyleHandle.current) {
    const styleUpdaterContainer = animatedUpdaterData.current.styleUpdaterContainer;
    animatedStyleHandle.current = IS_JEST ? {
      viewDescriptors,
      initial,
      jestAnimatedValues,
      toJSON: animatedStyleHandleToJSON,
      styleUpdaterContainer
    } : {
      viewDescriptors,
      initial,
      styleUpdaterContainer
    };
  }
  return animatedStyleHandle.current;
}
function animatedStyleHandleToJSON() {
  return '{}';
}
//# sourceMappingURL=useAnimatedStyle.js.map