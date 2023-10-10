'use strict';

import type { AnimationConfig, AnimationNames, CustomConfig } from './config';
import { Animations } from './config';
import type { AnimatedComponentProps } from '../../../createAnimatedComponent/utils';
import { LayoutAnimationType } from '../animationBuilder/commonTypes';
import type { TransitionData } from './animationParser';
import type { StyleProps } from '../..//commonTypes';
import { createAnimationWithExistingTransform } from './createAnimation';
import {
  getProcessedConfig,
  handleEnteringAnimation,
  handleExitingAnimation,
  handleLayoutTransition,
  makeElementVisible,
} from './elementManager';
import { areDOMRectsEqual } from './DOMManager';
import type { TransformsStyle } from 'react-native';

function chooseConfig<ComponentProps extends Record<string, unknown>>(
  animationType: LayoutAnimationType,
  props: Readonly<AnimatedComponentProps<ComponentProps>>
) {
  const config =
    animationType === LayoutAnimationType.ENTERING
      ? props.entering
      : animationType === LayoutAnimationType.EXITING
      ? props.exiting
      : animationType === LayoutAnimationType.LAYOUT
      ? props.layout
      : null;

  return config;
}

function checkUndefinedAnimationFail(
  initialAnimationName: string,
  isLayoutTransition: boolean,
  hasEnteringAnimation: boolean,
  element: HTMLElement
) {
  // This prevents crashes if we try to set animations that are not defined.
  // We don't care about layout transitions since they're created dynamically
  if (initialAnimationName in Animations || isLayoutTransition) {
    return false;
  }

  if (hasEnteringAnimation) {
    makeElementVisible(element);
  }

  console.warn(
    "[Reanimated] Couldn't load entering/exiting animation. Current version supports only predefined animations with modifiers: duration, delay, easing, randomizeDelay, wtihCallback, reducedMotion."
  );

  return true;
}

function checkReduceMotionFail(
  animationConfig: AnimationConfig,
  hasEnteringAnimation: boolean,
  element: HTMLElement
) {
  if (!animationConfig.reduceMotion) {
    return false;
  }

  if (hasEnteringAnimation) {
    makeElementVisible(element);
  }

  return true;
}

function chooseAction(
  animationType: LayoutAnimationType,
  animationConfig: AnimationConfig,
  element: HTMLElement,
  transitionData: TransitionData,
  transform?: NonNullable<TransformsStyle['transform']>
) {
  switch (animationType) {
    case LayoutAnimationType.ENTERING:
      handleEnteringAnimation(element, animationConfig);
      break;
    case LayoutAnimationType.LAYOUT:
      // `transitionData` is cast as defined because it is a result of calculations made inside componentDidUpdate method.
      // We can reach this piece of code only from componentDidUpdate, therefore this parameter will be defined.

      // @ts-ignore This property exists in SequencedTransition
      (transitionData as TransitionData).reversed = config.reversed
        ? // @ts-ignore This property exists in SequencedTransition
          config.reversed
        : false;

      handleLayoutTransition(
        element,
        animationConfig,
        transitionData,
        transform
      );
      break;
    case LayoutAnimationType.EXITING:
      handleExitingAnimation(element, animationConfig);
      break;
  }
}

export function startWebLayoutAnimation<
  ComponentProps extends Record<string, unknown>
>(
  props: Readonly<AnimatedComponentProps<ComponentProps>>,
  element: HTMLElement,
  animationType: LayoutAnimationType,
  transitionData?: TransitionData
) {
  const config = chooseConfig(animationType, props);
  if (!config) {
    return;
  }

  const hasEnteringAnimation = props.entering !== undefined;
  const isLayoutTransition = animationType === LayoutAnimationType.LAYOUT;
  const initialAnimationName =
    typeof config === 'function' ? config.name : config.constructor.name;

  const shouldFail = checkUndefinedAnimationFail(
    initialAnimationName,
    isLayoutTransition,
    hasEnteringAnimation,
    element
  );

  if (shouldFail) {
    return;
  }

  const transform = (props.style as StyleProps)?.transform;

  const animationName = transform
    ? createAnimationWithExistingTransform(initialAnimationName, transform)
    : initialAnimationName;

  const animationConfig = getProcessedConfig(
    animationName,
    config as CustomConfig,
    isLayoutTransition,
    initialAnimationName as AnimationNames
  );

  if (checkReduceMotionFail(animationConfig, hasEnteringAnimation, element)) {
    return;
  }

  chooseAction(
    animationType,
    animationConfig,
    element,
    transitionData as TransitionData,
    transform
  );
}

export function tryActivateLayoutTransition<
  ComponentProps extends Record<string, unknown>
>(
  props: Readonly<AnimatedComponentProps<ComponentProps>>,
  element: HTMLElement,
  snapshot: DOMRect
) {
  if (!props.layout) {
    return;
  }

  const rect = element.getBoundingClientRect();

  if (areDOMRectsEqual(rect, snapshot)) {
    return;
  }

  const transitionData: TransitionData = {
    translateX: snapshot.x - rect.x,
    translateY: snapshot.y - rect.y,
    scaleX: snapshot.width / rect.width,
    scaleY: snapshot.height / rect.height,
    reversed: false, // This field is used only in `SequencedTransition`, so by default it will be false
  };

  startWebLayoutAnimation(
    props,
    element,
    LayoutAnimationType.LAYOUT,
    transitionData
  );
}
