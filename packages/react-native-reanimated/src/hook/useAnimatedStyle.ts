'use strict';
import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import type { WorkletFunction } from 'react-native-worklets';
import { isWorkletFunction, makeShareable } from 'react-native-worklets';

import { initialUpdaterRun } from '../animation';
import { IS_JEST } from '../common';
import type {
  AnimatedPropsAdapterFunction,
  AnimatedPropsAdapterWorklet,
  AnimatedStyle,
  SharedValue,
  Timestamp,
} from '../commonTypes';
import { startMapper, stopMapper } from '../core';
import type { AnimatedProps } from '../createAnimatedComponent/commonTypes';
import { updatePropsJestWrapper } from '../updateProps';
import { makeViewDescriptorsSet } from '../ViewDescriptorsSet';
import type {
  AnimatedStyleHandle,
  DefaultStyle,
  DependencyList,
  Descriptor,
  JestAnimatedStyleHandle,
} from './commonTypes';
import type {
  AnimatedState,
  AnimatedUpdaterData,
} from './useAnimatedStyleCommon';
import {
  buildWorkletsHash,
  checkSharedValueUsage,
  prepareAnimation,
  runAnimations,
  styleUpdater,
} from './useAnimatedStyleCommon';
import { useSharedValue } from './useSharedValue';
import { isAnimated, shallowEqual, validateAnimatedStyles } from './utils';

function jestStyleUpdater(
  viewDescriptors: SharedValue<Descriptor[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updater: WorkletFunction<[], AnimatedStyle<any>> | (() => AnimatedStyle<any>),
  state: AnimatedState,
  animationsActive: SharedValue<boolean>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animatedValues: RefObject<AnimatedStyle<any>>,
  adapters: AnimatedPropsAdapterFunction[],
  forceUpdate?: boolean
): void {
  'worklet';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      updatePropsJestWrapper(
        viewDescriptors,
        updates,
        animatedValues,
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

  if (!shallowEqual(oldValues, newValues) || forceUpdate) {
    updatePropsJestWrapper(
      viewDescriptors,
      newValues,
      animatedValues,
      adapters
    );
  }
}

function animatedStyleHandleToJSON(): string {
  return '{}';
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
// @ts-expect-error Public type definition which strips internals.
export function useAnimatedStyle<Style extends DefaultStyle>(
  updater: () => Style,
  dependencies?: DependencyList | null
): AnimatedStyleHandle<Style>;

export function useAnimatedStyle<Style extends DefaultStyle | AnimatedProps>(
  updater:
    | WorkletFunction<[], Style>
    | ((() => Style) & Record<string, unknown>),
  dependencies?: DependencyList | null,
  adapters?: AnimatedPropsAdapterWorklet | AnimatedPropsAdapterWorklet[] | null,
  isAnimatedProps = false
):
  | AnimatedStyleHandle<Style | AnimatedProps>
  | JestAnimatedStyleHandle<Style | AnimatedProps> {
  const animatedUpdaterData = useRef<AnimatedUpdaterData | null>(null);
  let inputs = Object.values(updater.__closure ?? {});
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
    throw new Error(
      `[Reanimated] \`useAnimatedStyle\` was used without a dependency array or Babel plugin. Please explicitly pass a dependency array, or enable the Babel plugin.
For more, see the docs: \`https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support#web-without-the-babel-plugin\`.`
    );
  }
  const adaptersArray = adapters
    ? Array.isArray(adapters)
      ? adapters
      : [adapters]
    : [];
  const adaptersHash = adapters ? buildWorkletsHash(adaptersArray) : null;
  const areAnimationsActive = useSharedValue<boolean>(true);
  const jestAnimatedValues = useRef<AnimatedStyle<Style | AnimatedProps>>(
    {} as AnimatedStyle<Style | AnimatedProps>
  );

  // build dependencies
  if (!dependencies) {
    dependencies = [...inputs, updater.__workletHash];
  } else {
    dependencies = [...dependencies, updater.__workletHash];
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
        updater,
      },
      remoteState: makeShareable({
        last: initialStyle,
        animations: {},
        isAnimationCancelled: false,
        isAnimationRunning: false,
      }),
      viewDescriptors: makeViewDescriptorsSet(),
      styleUpdaterContainer: { current: undefined },
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

    if (IS_JEST) {
      fun = (forceUpdate?: boolean) => {
        'worklet';
        jestStyleUpdater(
          shareableViewDescriptors,
          updater,
          remoteState,
          areAnimationsActive,
          jestAnimatedValues,
          adaptersArray,
          forceUpdate
        );
      };
    } else {
      fun = (forceUpdate?: boolean) => {
        'worklet';
        styleUpdater(
          shareableViewDescriptors,
          updaterFn,
          remoteState,
          areAnimationsActive,
          isAnimatedProps,
          forceUpdate
        );
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

  const animatedStyleHandle = useRef<
    | AnimatedStyleHandle<Style | AnimatedProps>
    | JestAnimatedStyleHandle<Style | AnimatedProps>
    | null
  >(null);

  if (!animatedStyleHandle.current) {
    const styleUpdaterContainer =
      animatedUpdaterData.current.styleUpdaterContainer;
    animatedStyleHandle.current = IS_JEST
      ? {
          viewDescriptors,
          initial,
          jestAnimatedValues,
          toJSON: animatedStyleHandleToJSON,
          styleUpdaterContainer,
        }
      : {
          viewDescriptors,
          initial,
          styleUpdaterContainer,
        };
  }

  return animatedStyleHandle.current;
}
