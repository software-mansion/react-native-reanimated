'use strict';
import { useEffect, useRef } from 'react';
import type { WorkletFunction } from 'react-native-worklets';
import { makeShareable } from 'react-native-worklets';

import { initialUpdaterRun } from '../animation';
import type { AnimatedPropsAdapterWorklet } from '../commonTypes';
import { startMapper, stopMapper } from '../core';
import type { AnimatedProps } from '../createAnimatedComponent/commonTypes';
import { makeViewDescriptorsSet } from '../ViewDescriptorsSet';
import type {
  AnimatedStyleHandle,
  DefaultStyle,
  DependencyList,
} from './commonTypes';
import type { AnimatedUpdaterData } from './useAnimatedStyleCommon';
import {
  buildWorkletsHash,
  checkSharedValueUsage,
  styleUpdater,
} from './useAnimatedStyleCommon';
import { useSharedValue } from './useSharedValue';
import { validateAnimatedStyles } from './utils';

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
): AnimatedStyleHandle<Style | AnimatedProps> {
  const animatedUpdaterData = useRef<AnimatedUpdaterData | null>(null);
  const inputs = Object.values(updater.__closure ?? {});
  const adaptersArray = adapters
    ? Array.isArray(adapters)
      ? adapters
      : [adapters]
    : [];
  const adaptersHash = adapters ? buildWorkletsHash(adaptersArray) : null;
  const areAnimationsActive = useSharedValue<boolean>(true);

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

    const fun = (forceUpdate?: boolean) => {
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

  const animatedStyleHandle = useRef<AnimatedStyleHandle<
    Style | AnimatedProps
  > | null>(null);

  if (!animatedStyleHandle.current) {
    const styleUpdaterContainer =
      animatedUpdaterData.current.styleUpdaterContainer;
    animatedStyleHandle.current = {
      viewDescriptors,
      initial,
      styleUpdaterContainer,
    };
  }

  return animatedStyleHandle.current;
}
