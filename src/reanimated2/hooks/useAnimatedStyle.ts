/* global _frameTimestamp */

import { MutableRefObject, useEffect, useRef } from 'react';

import {
  startMapper,
  stopMapper,
  makeRemote,
  requestFrame,
  getTimestamp,
} from '../core';
import updateProps, { updatePropsJestWrapper } from '../UpdateProps';
import { initialUpdaterRun } from '../animations';
import NativeReanimated from '../NativeReanimated';
import { Platform } from 'react-native';
import { useSharedValue } from './useSharedValue';
import {
  buildWorkletsHash,
  canApplyOptimalisation,
  getStyleWithoutAnimations,
  hasColorProps,
  isAnimated,
  parseColors,
  styleDiff,
  validateAnimatedStyles,
} from './utils';
import {
  AdapterWorkletFunction,
  AnimatedState,
  AnimatedStyle,
  AnimatedStyleValue,
  AnimationObject,
  AnimationRef,
  BasicWorkletFunction,
  DependencyList,
  Descriptor,
  SharedValue,
  WorkletFunction,
} from './commonTypes';

function prepareAnimation(
  animatedProp: AnimatedStyleValue,
  lastAnimation: AnimatedStyleValue,
  lastValue: AnimatedStyleValue
): void {
  'worklet';
  if (Array.isArray(animatedProp)) {
    animatedProp.forEach((prop, index) =>
      prepareAnimation(
        prop,
        lastAnimation && lastAnimation[index],
        lastValue && lastValue[index]
      )
    );
    // return animatedProp;
  }
  if (typeof animatedProp === 'object' && animatedProp.onFrame) {
    const animation = animatedProp;

    let value = animation.current;
    if (lastValue !== undefined) {
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

    animation.callStart = (timestamp) => {
      animation.onStart(animation, value, timestamp, lastAnimation);
    };
    animation.callStart(getTimestamp());
    animation.callStart = null;
  } else if (typeof animatedProp === 'object') {
    // it is an object
    Object.keys(animatedProp).forEach((key) =>
      prepareAnimation(
        animatedProp[key],
        lastAnimation && lastAnimation[key],
        lastValue && lastValue[key]
      )
    );
  }
}

function runAnimations(animation, timestamp, key, result, animationsActive) {
  'worklet';
  if (!animationsActive.value) {
    return true;
  }
  if (Array.isArray(animation)) {
    result[key] = [];
    let allFinished = true;
    animation.forEach((entry, index) => {
      if (
        !runAnimations(entry, timestamp, index, result[key], animationsActive)
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
    result[key] = animation.current;
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
          animationsActive
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
  viewDescriptor: SharedValue<Descriptor>,
  updater: BasicWorkletFunction<AnimatedStyle>,
  state: AnimatedState,
  maybeViewRef: MutableRefObject<any> | undefined,
  animationsActive: SharedValue<boolean>
): void {
  'worklet';
  const animations = state.animations || [];
  const newValues = updater() || {};
  const oldValues = state.last;

  let hasAnimations = false;
  for (const key in newValues) {
    const value = newValues[key];
    if (isAnimated(value)) {
      prepareAnimation(value, animations[key], oldValues[key]);
      animations[key] = value;
      hasAnimations = true;
    } else {
      delete animations[key];
    }
  }

  if (hasAnimations) {
    const frame = (timestamp) => {
      const { animations, last, isAnimationCancelled } = state;
      if (isAnimationCancelled) {
        state.isAnimationRunning = false;
        return;
      }

      const updates = {};
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
          last[propName] = updates[propName];
          delete animations[propName];
        } else {
          allFinished = false;
        }
      }

      if (updates) {
        updateProps(viewDescriptor, updates, maybeViewRef);
      }

      if (!allFinished) {
        requestFrame(frame);
      } else {
        state.isAnimationRunning = false;
      }
    };

    state.animations = animations;
    if (!state.isAnimationRunning) {
      state.isAnimationCancelled = false;
      state.isAnimationRunning = true;
      if (_frameTimestamp) {
        frame(_frameTimestamp);
      } else {
        requestFrame(frame);
      }
    }
    state.last = Object.assign({}, oldValues, newValues);
    const style = getStyleWithoutAnimations(oldValues);
    if (style) {
      updateProps(viewDescriptor, style, maybeViewRef);
    }
  } else {
    state.isAnimationCancelled = true;
    state.animations = [];
    updateProps(viewDescriptor, newValues, maybeViewRef);
  }
}

function jestStyleUpdater(
  viewDescriptor: SharedValue<Descriptor>,
  updater: BasicWorkletFunction<AnimatedStyle>,
  state: AnimatedState,
  maybeViewRef: MutableRefObject<any> | undefined,
  animationsActive: SharedValue<boolean>,
  animatedStyle: MutableRefObject<AnimatedStyle>,
  adapters: WorkletFunction[] = []
): void {
  'worklet';
  const animations: AnimationObject[] = state.animations || [];
  const newValues = updater() || {};
  const oldValues = state.last;

  // extract animated props
  let hasAnimations = false;
  Object.keys(animations).forEach((key) => {
    const value = newValues[key];
    if (!isAnimated(value)) {
      delete animations[key];
    }
  });
  Object.keys(newValues).forEach((key) => {
    const value = newValues[key];
    if (isAnimated(value)) {
      prepareAnimation(value, animations[key], oldValues[key]);
      animations[key] = value;
      hasAnimations = true;
    }
  });

  function frame(timestamp) {
    const { animations, last, isAnimationCancelled } = state;
    if (isAnimationCancelled) {
      state.isAnimationRunning = false;
      return;
    }

    const updates = {};
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
      updatePropsJestWrapper(
        viewDescriptor,
        updates,
        maybeViewRef,
        animatedStyle,
        adapters
      );
    }

    if (!allFinished) {
      requestFrame(frame);
    } else {
      state.isAnimationRunning = false;
    }
  }

  if (hasAnimations) {
    state.animations = animations;
    if (!state.isAnimationRunning) {
      state.isAnimationCancelled = false;
      state.isAnimationRunning = true;
      if (_frameTimestamp) {
        frame(_frameTimestamp);
      } else {
        requestFrame(frame);
      }
    }
  } else {
    state.isAnimationCancelled = true;
    state.animations = [];
  }

  // calculate diff
  const diff = styleDiff(oldValues, newValues);
  state.last = Object.assign({}, oldValues, newValues);

  if (Object.keys(diff).length !== 0) {
    updatePropsJestWrapper(
      viewDescriptor,
      diff,
      maybeViewRef,
      animatedStyle,
      adapters
    );
  }
}

export function useAnimatedStyle<T extends AnimatedStyle>(
  updater: BasicWorkletFunction<T>,
  dependencies?: DependencyList,
  adapters?: AdapterWorkletFunction | AdapterWorkletFunction[]
) {
  const viewDescriptor = useSharedValue<Descriptor>({ tag: -1, name: null });
  const initRef = useRef<AnimationRef>(null);
  const inputs = Object.values(updater._closure);
  const viewRef = useRef(null);
  const adaptersArray: AdapterWorkletFunction[] =
    !adapters || Array.isArray(adapters)
      ? <AdapterWorkletFunction[]>adapters
      : [adapters];
  const adaptersHash = adapters ? buildWorkletsHash(adaptersArray) : null;
  const animationsActive = useSharedValue<boolean>(true);
  let animatedStyle: MutableRefObject<AnimatedStyle>;
  if (process.env.JEST_WORKER_ID) {
    animatedStyle = useRef<AnimatedStyle>({});
  }

  // build dependencies
  if (!dependencies) {
    dependencies = [...inputs, updater.__workletHash];
  } else {
    dependencies.push(updater.__workletHash);
  }
  adaptersHash && dependencies.push(adaptersHash);

  if (initRef.current === null) {
    const initial: AnimatedStyle = initialUpdaterRun(updater);
    validateAnimatedStyles(initial);
    initRef.current = {
      initial,
      remoteState: makeRemote({ last: initial }),
    };
  }

  const { remoteState, initial } = initRef.current;
  const maybeViewRef = NativeReanimated.native ? undefined : viewRef;

  useEffect(() => {
    let fun;
    let upadterFn = updater;
    let optimalization = updater.__optimalization;
    if (adaptersArray) {
      upadterFn = () => {
        'worklet';
        const newValues = updater();
        adaptersArray.forEach((adapter) => {
          adapter(newValues);
        });
        return newValues;
      };
    }

    if (canApplyOptimalisation(upadterFn) && Platform.OS !== 'web') {
      if (hasColorProps(upadterFn())) {
        upadterFn = () => {
          'worklet';
          const style = upadterFn();
          parseColors(style);
          return style;
        };
      }
    } else if (Platform.OS !== 'web') {
      optimalization = 0;
      upadterFn = () => {
        'worklet';
        const style = upadterFn();
        parseColors(style);
        return style;
      };
    }
    if (typeof updater.__optimalization !== undefined) {
      upadterFn.__optimalization = optimalization;
    }

    if (process.env.JEST_WORKER_ID) {
      fun = () => {
        'worklet';
        jestStyleUpdater(
          viewDescriptor,
          updater,
          remoteState,
          maybeViewRef,
          animationsActive,
          animatedStyle,
          adaptersArray
        );
      };
    } else {
      fun = () => {
        'worklet';
        styleUpdater(
          viewDescriptor,
          upadterFn,
          remoteState,
          maybeViewRef,
          animationsActive
        );
      };
    }
    const mapperId = startMapper(
      fun,
      inputs,
      [],
      upadterFn,
      viewDescriptor.value.tag,
      viewDescriptor.value.name || 'RCTView'
    );
    return () => {
      stopMapper(mapperId);
    };
  }, dependencies);

  useEffect(() => {
    animationsActive.value = true;
    return () => {
      initRef.current = null;
      viewRef.current = null;
      animationsActive.value = false;
    };
  }, []);

  // check for invalid usage of shared values in returned object
  let wrongKey;
  const isObjectValid = (element, key) => {
    const result = typeof element === 'object' && element.value !== undefined;
    if (result) {
      wrongKey = key;
    }
    return !result;
  };
  const isError = Object.keys(initial).some((key) => {
    const element = initial[key];
    let result = false;
    // a case for transform that has a format of an array of objects
    if (Array.isArray(element)) {
      for (const elementArrayItem of element) {
        // this means unhandled format and it doesn't match the transform format
        if (typeof elementArrayItem !== 'object') {
          break;
        }
        const objectValue = Object.values(elementArrayItem)[0];
        result = isObjectValid(objectValue, key);
        if (!result) {
          break;
        }
      }
    } else {
      result = isObjectValid(element, key);
    }
    return !result;
  });
  if (isError && wrongKey !== undefined) {
    throw new Error(
      `invalid value passed to \`${wrongKey}\`, maybe you forgot to use \`.value\`?`
    );
  }

  if (process.env.JEST_WORKER_ID) {
    return { viewDescriptor, initial, viewRef, animatedStyle };
  } else {
    return { viewDescriptor, initial, viewRef };
  }
}
