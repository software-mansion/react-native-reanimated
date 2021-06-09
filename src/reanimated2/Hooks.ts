/* global _frameTimestamp */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useRef, useCallback } from 'react';

import WorkletEventHandler from './WorkletEventHandler';
import {
  startMapper,
  stopMapper,
  makeMutable,
  makeRemote,
  requestFrame,
  getTimestamp,
} from './core';
import updateProps, { updatePropsJestWrapper, colorProps } from './UpdateProps';
import { initialUpdaterRun, cancelAnimation } from './animations';
import { getTag } from './NativeMethods';
import NativeReanimated from './NativeReanimated';
import { Platform } from 'react-native';
import { processColor } from './Colors';

export function useSharedValue(init) {
  const ref = useRef(null);
  if (ref.current === null) {
    ref.current = makeMutable(init);
  }

  useEffect(() => {
    return () => {
      cancelAnimation(ref.current);
    };
  }, []);

  return ref.current;
}

export function useEvent(handler, eventNames = [], rebuild = false) {
  const initRef = useRef(null);
  if (initRef.current === null) {
    initRef.current = new WorkletEventHandler(handler, eventNames);
  } else if (rebuild) {
    initRef.current.updateWorklet(handler);
  }

  useEffect(() => {
    return () => {
      initRef.current = null;
    };
  }, []);

  return initRef;
}

function prepareAnimation(animatedProp, lastAnimation, lastValue) {
  'worklet';
  if (Array.isArray(animatedProp)) {
    animatedProp.forEach((prop, index) =>
      prepareAnimation(
        prop,
        lastAnimation && lastAnimation[index],
        lastValue && lastValue[index]
      )
    );
    return animatedProp;
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

function isAnimated(prop) {
  'worklet';
  if (Array.isArray(prop)) {
    for (let i = 0; i < prop.length; ++i) {
      const item = prop[i];
      for (const key in item) {
        if (item[key].onFrame !== undefined) {
          return true;
        }
      }
    }
    return false;
  }
  return prop?.onFrame !== undefined;
}

function styleDiff(oldStyle, newStyle) {
  'worklet';
  const diff = {};
  Object.keys(oldStyle).forEach((key) => {
    if (newStyle[key] === undefined) {
      diff[key] = null;
    }
  });
  Object.keys(newStyle).forEach((key) => {
    const value = newStyle[key];
    const oldValue = oldStyle[key];

    if (isAnimated(value)) {
      // do nothing
      return;
    }
    if (
      oldValue !== value &&
      JSON.stringify(oldValue) !== JSON.stringify(value)
    ) {
      // I'd use deep equal here but that'd take additional work and this was easier
      diff[key] = value;
    }
  });
  return diff;
}

function getStyleWithoutAnimations(newStyle) {
  'worklet';
  const diff = {};

  for (const key in newStyle) {
    const value = newStyle[key];
    if (isAnimated(value)) {
      continue;
    }
    diff[key] = value;
  }
  return diff;
}

const validateAnimatedStyles = (styles) => {
  'worklet';
  if (typeof styles !== 'object') {
    throw new Error(
      `useAnimatedStyle has to return an object, found ${typeof styles} instead`
    );
  } else if (Array.isArray(styles)) {
    throw new Error(
      'useAnimatedStyle has to return an object and cannot return static styles combined with dynamic ones. Please do merging where a component receives props.'
    );
  }
};

function styleUpdater(
  viewDescriptor,
  updater,
  state,
  maybeViewRef,
  animationsActive
) {
  'worklet';
  const animations = state.animations || {};
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
    const style = getStyleWithoutAnimations(oldValues, newValues);
    if (style) {
      updateProps(viewDescriptor, style, maybeViewRef);
    }
  } else {
    state.isAnimationCancelled = true;
    state.animations = {};
    updateProps(viewDescriptor, newValues, maybeViewRef);
  }
}

function jestStyleUpdater(
  viewDescriptor,
  updater,
  state,
  maybeViewRef,
  animationsActive,
  animatedStyle,
  adapters = []
) {
  'worklet';
  const animations = state.animations || {};
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
    state.animations = {};
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
const colorPropsSet = new Set(colorProps);
const hasColorProps = (updates) => {
  for (const key in updates) {
    if (colorPropsSet.has(key)) {
      return true;
    }
  }
  return false;
};

const parseColors = (updates) => {
  'worklet';
  for (const key in updates) {
    if (colorProps.indexOf(key) !== -1) {
      updates[key] = processColor(updates[key]);
    }
  }
};

const canApplyOptimalisation = (upadterFn) => {
  const FUNCTIONLESS_FLAG = 0b00000001;
  const STATEMENTLESS_FLAG = 0b00000010;
  const optimalization = upadterFn.__optimalization;
  return (
    optimalization & FUNCTIONLESS_FLAG && optimalization & STATEMENTLESS_FLAG
  );
};

export function useAnimatedStyle(updater, dependencies, adapters) {
  const viewDescriptor = useSharedValue({ tag: -1, name: null }, false);
  const initRef = useRef(null);
  const inputs = Object.values(updater._closure);
  const viewRef = useRef(null);
  adapters = !adapters || Array.isArray(adapters) ? adapters : [adapters];
  const adaptersHash = adapters ? buildWorkletsHash(adapters) : null;
  const animationsActive = useSharedValue(true);
  let animatedStyle;
  if (process.env.JEST_WORKER_ID) {
    animatedStyle = useRef({});
  }

  // build dependencies
  if (!dependencies) {
    dependencies = [...inputs, updater.__workletHash];
  } else {
    dependencies.push(updater.__workletHash);
  }
  adaptersHash && dependencies.push(adaptersHash);

  if (initRef.current === null) {
    const initial = initialUpdaterRun(updater);
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
    if (adapters) {
      upadterFn = () => {
        'worklet';
        const newValues = updater();
        adapters.forEach((adapter) => {
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
          adapters
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

// TODO: we should make sure that when useAP is used we are not assigning styles
// when you need styles to animated you should always use useAS
export const useAnimatedProps = useAnimatedStyle;

export function useDerivedValue(processor, dependencies) {
  const initRef = useRef(null);
  const inputs = Object.values(processor._closure);

  // build dependencies
  if (dependencies === undefined) {
    dependencies = [...inputs, processor.__workletHash];
  } else {
    dependencies.push(processor.__workletHash);
  }

  if (initRef.current === null) {
    initRef.current = makeMutable(initialUpdaterRun(processor));
  }

  const sharedValue = initRef.current;

  useEffect(() => {
    const fun = () => {
      'worklet';
      sharedValue.value = processor();
    };
    const mapperId = startMapper(fun, inputs, [sharedValue]);
    return () => {
      stopMapper(mapperId);
    };
  }, dependencies);

  useEffect(() => {
    return () => {
      initRef.current = null;
    };
  }, []);

  return sharedValue;
}

// builds one big hash from multiple worklets' hashes
function buildWorkletsHash(handlers) {
  return Object.keys(handlers).reduce(
    (previousValue, key) =>
      previousValue === null
        ? handlers[key].__workletHash
        : previousValue.toString() + handlers[key].__workletHash.toString(),
    null
  );
}

// builds dependencies array for gesture handlers
function buildDependencies(dependencies, handlers) {
  if (!dependencies) {
    dependencies = Object.keys(handlers).map((handlerKey) => {
      const handler = handlers[handlerKey];
      return {
        workletHash: handler.__workletHash,
        closure: handler._closure,
      };
    });
  } else {
    dependencies.push(buildWorkletsHash(handlers));
  }
  return dependencies;
}

// this is supposed to work as useEffect comparison
function areDependenciesEqual(nextDeps, prevDeps) {
  function is(x, y) {
    /* eslint-disable no-self-compare */
    return (x === y && (x !== 0 || 1 / x === 1 / y)) || (x !== x && y !== y);
    /* eslint-enable no-self-compare */
  }
  const objectIs = typeof Object.is === 'function' ? Object.is : is;

  function areHookInputsEqual(nextDeps, prevDeps) {
    if (!nextDeps || !prevDeps || prevDeps.length !== nextDeps.length) {
      return false;
    }
    for (let i = 0; i < prevDeps.length; ++i) {
      if (!objectIs(nextDeps[i], prevDeps[i])) {
        return false;
      }
    }
    return true;
  }

  return areHookInputsEqual(nextDeps, prevDeps);
}

export function useAnimatedGestureHandler(handlers, dependencies) {
  const initRef = useRef(null);
  if (initRef.current === null) {
    initRef.current = {
      context: makeRemote({}),
      savedDependencies: [],
    };
  }

  useEffect(() => {
    return () => {
      initRef.current = null;
    };
  }, []);

  const { context, savedDependencies } = initRef.current;

  dependencies = buildDependencies(dependencies, handlers);

  const dependenciesDiffer = !areDependenciesEqual(
    dependencies,
    savedDependencies
  );
  initRef.current.savedDependencies = dependencies;

  const handler = (event) => {
    'worklet';
    event = Platform.OS === 'web' ? event.nativeEvent : event;

    const FAILED = 1;
    const BEGAN = 2;
    const CANCELLED = 3;
    const ACTIVE = 4;
    const END = 5;

    if (event.state === BEGAN && handlers.onStart) {
      handlers.onStart(event, context);
    }
    if (event.state === ACTIVE && handlers.onActive) {
      handlers.onActive(event, context);
    }
    if (event.oldState === ACTIVE && event.state === END && handlers.onEnd) {
      handlers.onEnd(event, context);
    }
    if (event.oldState === BEGAN && event.state === FAILED && handlers.onFail) {
      handlers.onFail(event, context);
    }
    if (
      event.oldState === ACTIVE &&
      event.state === CANCELLED &&
      handlers.onCancel
    ) {
      handlers.onCancel(event, context);
    }
    if (
      (event.oldState === BEGAN || event.oldState === ACTIVE) &&
      event.state !== BEGAN &&
      event.state !== ACTIVE &&
      handlers.onFinish
    ) {
      handlers.onFinish(
        event,
        context,
        event.state === CANCELLED || event.state === FAILED
      );
    }
  };

  if (Platform.OS === 'web') {
    return handler;
  }

  return useEvent(
    handler,
    ['onGestureHandlerStateChange', 'onGestureHandlerEvent'],
    dependenciesDiffer
  );
}

export function useAnimatedScrollHandler(handlers, dependencies) {
  const initRef = useRef(null);
  if (initRef.current === null) {
    initRef.current = {
      context: makeRemote({}),
      savedDependencies: [],
    };
  }

  useEffect(() => {
    return () => {
      initRef.current = null;
    };
  }, []);

  const { context, savedDependencies } = initRef.current;

  dependencies = buildDependencies(dependencies, handlers);

  const dependenciesDiffer = !areDependenciesEqual(
    dependencies,
    savedDependencies
  );
  initRef.current.savedDependencies = dependencies;

  // build event subscription array
  const subscribeForEvents = ['onScroll'];
  if (handlers.onBeginDrag !== undefined) {
    subscribeForEvents.push('onScrollBeginDrag');
  }
  if (handlers.onEndDrag !== undefined) {
    subscribeForEvents.push('onScrollEndDrag');
  }
  if (handlers.onMomentumBegin !== undefined) {
    subscribeForEvents.push('onMomentumScrollBegin');
  }
  if (handlers.onMomentumEnd !== undefined) {
    subscribeForEvents.push('onMomentumScrollEnd');
  }

  return useEvent(
    (event) => {
      'worklet';
      const {
        onScroll,
        onBeginDrag,
        onEndDrag,
        onMomentumBegin,
        onMomentumEnd,
      } = handlers;
      if (event.eventName.endsWith('onScroll')) {
        if (onScroll) {
          onScroll(event, context);
        } else if (typeof handlers === 'function') {
          handlers(event, context);
        }
      } else if (onBeginDrag && event.eventName.endsWith('onScrollBeginDrag')) {
        onBeginDrag(event, context);
      } else if (onEndDrag && event.eventName.endsWith('onScrollEndDrag')) {
        onEndDrag(event, context);
      } else if (
        onMomentumBegin &&
        event.eventName.endsWith('onMomentumScrollBegin')
      ) {
        onMomentumBegin(event, context);
      } else if (
        onMomentumEnd &&
        event.eventName.endsWith('onMomentumScrollEnd')
      ) {
        onMomentumEnd(event, context);
      }
    },
    subscribeForEvents,
    dependenciesDiffer
  );
}

export function useAnimatedRef() {
  const tag = useSharedValue(-1);
  const ref = useRef(null);

  if (!ref.current) {
    const fun = function (component) {
      'worklet';
      // enters when ref is set by attaching to a component
      if (component) {
        tag.value = getTag(component);
        fun.current = component;
      }
      return tag.value;
    };

    Object.defineProperty(fun, 'current', {
      value: null,
      writable: true,
      enumerable: false,
    });
    ref.current = fun;
  }

  return ref.current;
}

/**
 * @param prepare - worklet used for data preparation for the second parameter
 * @param react - worklet which takes data prepared by the one in the first parameter and performs certain actions
 * the first worklet defines the inputs, in other words on which shared values change will it be called.
 * the second one can modify any shared values but those which are mentioned in the first worklet. Beware of that, because this may result in endless loop and high cpu usage.
 */
export function useAnimatedReaction(prepare, react, dependencies) {
  const previous = useSharedValue(null);
  if (dependencies === undefined) {
    dependencies = [
      Object.values(prepare._closure),
      Object.values(react._closure),
      prepare.__workletHash,
      react.__workletHash,
    ];
  } else {
    dependencies.push(prepare.__workletHash, react.__workletHash);
  }

  useEffect(() => {
    const fun = () => {
      'worklet';
      const input = prepare();
      react(input, previous.value);
      previous.value = input;
    };
    const mapperId = startMapper(fun, Object.values(prepare._closure), []);
    return () => {
      stopMapper(mapperId);
    };
  }, dependencies);
}

export function useWorkletCallback(fun, deps) {
  return useCallback(fun, deps);
}

export function createWorklet(fun) {
  return fun;
}
