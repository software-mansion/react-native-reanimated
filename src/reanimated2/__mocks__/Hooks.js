/* global _frameTimestamp */
import { useEffect, useRef } from 'react';

import { startMapper, stopMapper, makeRemote, requestFrame } from '../core';
import updateProps from './UpdateProps';
import { initialUpdaterRun } from '../animations';
import NativeReanimated from '../NativeReanimated';

const ReanimatedHooks = jest.requireActual('../Hooks');

export const useSharedValue = ReanimatedHooks.useSharedValue;
export const useEvent = ReanimatedHooks.useEvent;
export const useDerivedValue = ReanimatedHooks.useDerivedValue;
export const useAnimatedGestureHandler =
  ReanimatedHooks.useAnimatedGestureHandler;
export const useAnimatedScrollHandler =
  ReanimatedHooks.useAnimatedScrollHandler;
export const useAnimatedRef = ReanimatedHooks.useAnimatedRef;
export const useAnimatedReaction = ReanimatedHooks.useAnimatedReaction;
export const useWorkletCallback = ReanimatedHooks.useWorkletCallback;
export const createWorklet = ReanimatedHooks.createWorklet;
export const useAnimatedProps = ReanimatedHooks.useAnimatedProps;

function styleUpdater(
  viewDescriptor,
  updater,
  state,
  maybeViewRef,
  adapters,
  animationsActive,
  animatedStyle
) {
  'worklet';
  const animations = state.animations || {};
  const newValues = updater() || {};
  const oldValues = state.last;

  // extract animated props
  let hasAnimations = false;
  Object.keys(animations).forEach((key) => {
    const value = newValues[key];
    if (!ReanimatedHooks.isAnimated(value)) {
      delete animations[key];
    }
  });
  Object.keys(newValues).forEach((key) => {
    const value = newValues[key];
    if (ReanimatedHooks.isAnimated(value)) {
      ReanimatedHooks.prepareAnimation(value, animations[key], oldValues[key]);
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
      const finished = ReanimatedHooks.runAnimations(
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
      updateProps(
        viewDescriptor,
        updates,
        maybeViewRef,
        adapters,
        animatedStyle
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
  const diff = ReanimatedHooks.styleDiff(oldValues, newValues);
  state.last = Object.assign({}, oldValues, newValues);

  if (Object.keys(diff).length !== 0) {
    updateProps(viewDescriptor, diff, maybeViewRef, adapters, animatedStyle);
  }
}

export function useAnimatedStyle(updater, dependencies, adapters) {
  const viewDescriptor = useSharedValue({ tag: -1, name: null }, false);
  const initRef = useRef(null);
  const inputs = Object.values(updater._closure);
  const viewRef = useRef(null);
  adapters = !adapters || Array.isArray(adapters) ? adapters : [adapters];
  const adaptersHash = adapters ? null : null;
  const animationsActive = useSharedValue(true);
  const animatedStyle = useRef({});

  // build dependencies
  if (!dependencies) {
    dependencies = [...inputs, updater.__workletHash];
  } else {
    dependencies.push(updater.__workletHash);
  }
  adaptersHash && dependencies.push(adaptersHash);

  if (initRef.current === null) {
    const initial = initialUpdaterRun(updater);
    ReanimatedHooks.validateAnimatedStyles(initial);
    initRef.current = {
      initial,
      remoteState: makeRemote({ last: initial }),
    };
  }

  const { remoteState, initial } = initRef.current;
  const maybeViewRef = NativeReanimated.native ? undefined : viewRef;

  useEffect(() => {
    const fun = () => {
      'worklet';
      styleUpdater(
        viewDescriptor,
        updater,
        remoteState,
        maybeViewRef,
        adapters,
        animationsActive,
        animatedStyle
      );
    };
    const mapperId = startMapper(fun, inputs, []);
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
  const isError = Object.keys(initial).some((key) => {
    const element = initial[key];
    const result = typeof element === 'object' && element.value !== undefined;
    if (result) {
      wrongKey = key;
    }
    return result;
  });
  if (isError && wrongKey !== undefined) {
    throw new Error(
      `invalid value passed to \`${wrongKey}\`, maybe you forgot to use \`.value\`?`
    );
  }

  return { viewDescriptor, initial, viewRef, animatedStyle };
}
