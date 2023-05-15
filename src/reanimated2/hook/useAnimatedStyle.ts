import { MutableRefObject, useEffect, useRef } from 'react';

import { startMapper, stopMapper, makeRemote } from '../core';
import updateProps, { updatePropsJestWrapper } from '../UpdateProps';
import { initialUpdaterRun } from '../animation';
import NativeReanimatedModule from '../NativeReanimated';
import { useSharedValue } from './useSharedValue';
import {
  buildWorkletsHash,
  isAnimated,
  shallowEqual,
  validateAnimatedStyles,
} from './utils';
import { DependencyList, Descriptor } from './commonTypes';
import {
  makeViewDescriptorsSet,
  makeViewsRefSet,
  ViewDescriptorsSet,
  ViewRefSet,
} from '../ViewDescriptorsSet';
import { isJest, shouldBeUseWeb } from '../PlatformChecker';
import {
  AnimationObject,
  Timestamp,
  AdapterWorkletFunction,
  AnimatedStyle,
  BasicWorkletFunction,
  BasicWorkletFunctionOptional,
  NestedObjectValues,
  SharedValue,
  StyleProps,
} from '../commonTypes';
export interface AnimatedStyleResult {
  viewDescriptors: ViewDescriptorsSet;
  initial: AnimatedStyle;
  viewsRef: ViewRefSet<any>;
  animatedStyle?: MutableRefObject<AnimatedStyle>;
}

interface AnimatedState {
  last: AnimatedStyle;
  animations: AnimatedStyle;
  isAnimationRunning: boolean;
  isAnimationCancelled: boolean;
}

interface AnimationRef {
  initial: {
    value: AnimatedStyle;
    updater: () => AnimatedStyle;
  };
  remoteState: AnimatedState;
  viewDescriptors: ViewDescriptorsSet;
}

function prepareAnimation(
  frameTimestamp: number,
  animatedProp: AnimatedStyle,
  lastAnimation: AnimatedStyle,
  lastValue: AnimatedStyle
): void {
  'worklet';

  const maxStackSize = 1024;
  interface stackElement {
    animatedProp: AnimatedStyle;
    lastAnimation: AnimatedStyle;
    lastValue: AnimatedStyle;
  }
  const stack = new Array<stackElement>(maxStackSize);
  let stackSize = 0;
  stack[stackSize++] = { animatedProp, lastAnimation, lastValue };

  function checkStackSize() {
    if (stackSize >= maxStackSize) {
      throw new Error('Maximum stack size exceeded while preparing animation.');
    }
  }

  while (stackSize > 0) {
    const current = stack[--stackSize];
    if (
      typeof current.animatedProp === 'object' &&
      current.animatedProp.onFrame
    ) {
      prepareTheThing(
        frameTimestamp,
        current.animatedProp,
        current.lastAnimation,
        current.lastValue
      );
    } else if (Array.isArray(current.animatedProp)) {
      current.animatedProp.forEach((prop, index) => {
        stack[stackSize++] = {
          animatedProp: prop,
          lastAnimation: current.lastAnimation && current.lastAnimation[index],
          lastValue: current.lastValue && current.lastValue[index],
        };
        checkStackSize();
      });
    } else if (typeof current.animatedProp === 'object') {
      Object.keys(current.animatedProp).forEach((key) => {
        stack[stackSize++] = {
          animatedProp: current.animatedProp[key],
          lastAnimation: lastAnimation && lastAnimation[key],
          lastValue: lastValue && lastValue[key],
        };
        checkStackSize();
      });
    }
  }
}

const prepareTheThing = (
  frameTimestamp: number,
  animatedProp: AnimatedStyle,
  lastAnimation: AnimatedStyle,
  lastValue: AnimatedStyle
) => {
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
  animation.onStart(animation, value, frameTimestamp, lastAnimation);
};

function runAnimations(
  animation: AnimatedStyle,
  timestamp: Timestamp,
  key: number | string,
  result: AnimatedStyle,
  animationsActive: SharedValue<boolean>
): boolean {
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
  viewDescriptors: SharedValue<Descriptor[]>,
  updater: BasicWorkletFunction<AnimatedStyle>,
  state: AnimatedState,
  maybeViewRef: ViewRefSet<any> | undefined,
  animationsActive: SharedValue<boolean>
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
      frameTimestamp = global.__frameTimestamp || performance.now();
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
      const { animations, last, isAnimationCancelled } = state;
      if (isAnimationCancelled) {
        state.isAnimationRunning = false;
        return;
      }

      const updates: AnimatedStyle = {};
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
        updateProps(viewDescriptors, updates, maybeViewRef);
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
      updateProps(viewDescriptors, nonAnimatedNewValues, maybeViewRef);
    }
  } else {
    state.isAnimationCancelled = true;
    state.animations = [];

    if (!shallowEqual(oldValues, newValues)) {
      updateProps(viewDescriptors, newValues, maybeViewRef);
    }
  }
  state.last = newValues;
}

function jestStyleUpdater(
  viewDescriptors: SharedValue<Descriptor[]>,
  updater: BasicWorkletFunction<AnimatedStyle>,
  state: AnimatedState,
  maybeViewRef: ViewRefSet<any> | undefined,
  animationsActive: SharedValue<boolean>,
  animatedStyle: MutableRefObject<AnimatedStyle>,
  adapters: AdapterWorkletFunction[] = []
): void {
  'worklet';
  const animations: AnimatedStyle = state.animations ?? {};
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
      frameTimestamp = global.__frameTimestamp || performance.now();
      prepareAnimation(frameTimestamp, value, animations[key], oldValues[key]);
      animations[key] = value;
      hasAnimations = true;
    }
  });

  function frame(timestamp: Timestamp) {
    const { animations, last, isAnimationCancelled } = state;
    if (isAnimationCancelled) {
      state.isAnimationRunning = false;
      return;
    }

    const updates: AnimatedStyle = {};
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
        viewDescriptors,
        updates,
        maybeViewRef,
        animatedStyle,
        adapters
      );
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
    updatePropsJestWrapper(
      viewDescriptors,
      newValues,
      maybeViewRef,
      animatedStyle,
      adapters
    );
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
  } else if (typeof prop === 'object' && prop.value === undefined) {
    // if it's a nested object, run validation for all its props
    for (const key of Object.keys(prop)) {
      checkSharedValueUsage(prop[key], key);
    }
  } else if (
    currentKey !== undefined &&
    typeof prop === 'object' &&
    prop.value !== undefined
  ) {
    // if shared value is passed insted of its value, throw an error
    throw new Error(
      `invalid value passed to \`${currentKey}\`, maybe you forgot to use \`.value\`?`
    );
  }
}

export function useAnimatedStyle<T extends AnimatedStyle>(
  updater: BasicWorkletFunction<T>,
  dependencies?: DependencyList,
  adapters?: AdapterWorkletFunction | AdapterWorkletFunction[]
): AnimatedStyleResult {
  const viewsRef: ViewRefSet<any> = makeViewsRefSet();
  const initRef = useRef<AnimationRef>();
  let inputs = Object.values(updater._closure ?? {});
  if (shouldBeUseWeb()) {
    if (!inputs.length && dependencies?.length) {
      // let web work without a Babel/SWC plugin
      inputs = dependencies;
    }
    if (__DEV__ && !inputs.length && !dependencies && !updater.__workletHash) {
      throw new Error(
        `useAnimatedStyle was used without a dependency array or Babel plugin. Please explicitly pass a dependency array, or enable the Babel/SWC plugin.

For more, see the docs: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/web-support#web-without-a-babel-plugin`
      );
    }
  }
  const adaptersArray: AdapterWorkletFunction[] = adapters
    ? Array.isArray(adapters)
      ? adapters
      : [adapters]
    : [];
  const adaptersHash = adapters ? buildWorkletsHash(adaptersArray) : null;
  const animationsActive = useSharedValue<boolean>(true);
  const animatedStyle: MutableRefObject<AnimatedStyle> = useRef<AnimatedStyle>(
    {}
  );

  // build dependencies
  if (!dependencies) {
    dependencies = [...inputs, updater.__workletHash];
  } else {
    dependencies.push(updater.__workletHash);
  }
  adaptersHash && dependencies.push(adaptersHash);

  if (!initRef.current) {
    const initialStyle: AnimatedStyle = initialUpdaterRun(updater);
    validateAnimatedStyles(initialStyle);
    initRef.current = {
      initial: {
        value: initialStyle,
        updater: updater,
      },
      remoteState: makeRemote<AnimatedState>({
        last: initialStyle,
        animations: {},
        isAnimationCancelled: false,
        isAnimationRunning: false,
      }),
      viewDescriptors: makeViewDescriptorsSet(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { initial, remoteState, viewDescriptors } = initRef.current!;
  const sharableViewDescriptors = viewDescriptors.sharableViewDescriptors;
  const maybeViewRef = NativeReanimatedModule.native ? undefined : viewsRef;

  dependencies.push(sharableViewDescriptors);

  useEffect(() => {
    let fun;
    let updaterFn = updater as BasicWorkletFunctionOptional<T>;
    if (adapters) {
      updaterFn = () => {
        'worklet';
        const newValues = updater();
        adaptersArray.forEach((adapter) => {
          adapter(newValues);
        });
        return newValues;
      };
    }

    if (isJest()) {
      fun = () => {
        'worklet';
        jestStyleUpdater(
          sharableViewDescriptors,
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
          sharableViewDescriptors,
          updaterFn,
          remoteState,
          maybeViewRef,
          animationsActive
        );
      };
    }
    const mapperId = startMapper(fun, inputs);
    return () => {
      stopMapper(mapperId);
    };
  }, dependencies);

  useEffect(() => {
    animationsActive.value = true;
    return () => {
      animationsActive.value = false;
    };
  }, []);

  checkSharedValueUsage(initial.value);

  if (process.env.JEST_WORKER_ID) {
    return { viewDescriptors, initial: initial, viewsRef, animatedStyle };
  } else {
    return { viewDescriptors, initial: initial, viewsRef };
  }
}
