'use strict';

import type {
  AnimationConfig,
  AnimationNames,
  CustomConfig,
  KeyframeDefinitions,
} from './config';
import { Animations } from './config';
import type { AnimatedComponentProps } from '../../../createAnimatedComponent/utils';
import { LayoutAnimationType } from '../animationBuilder/commonTypes';
import type { StyleProps } from '../../commonTypes';
import {
  createAnimationWithExistingTransform,
  createCustomKeyFrameAnimation,
} from './createAnimation';
import {
  getProcessedConfig,
  handleEnteringAnimation,
  handleExitingAnimation,
  handleLayoutTransition,
  makeElementVisible,
} from './componentUtils';
import { areDOMRectsEqual } from './domUtils';
import type { TransformsStyle } from 'react-native';
import type { TransitionData } from './animationParser';
import { Keyframe } from '../animationBuilder';

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
  isCustomKeyframe: boolean,
  hasEnteringAnimation: boolean,
  element: HTMLElement
) {
  // This prevents crashes if we try to set animations that are not defined.
  // We don't care about layout transitions or custom keyframes since they're created dynamically
  if (
    initialAnimationName in Animations ||
    isLayoutTransition ||
    isCustomKeyframe
  ) {
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
      transitionData.reversed = animationConfig.reversed;

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
  const isCustomKeyframe = config instanceof Keyframe;
  const initialAnimationName =
    typeof config === 'function' ? config.name : config.constructor.name;

  const shouldFail = checkUndefinedAnimationFail(
    initialAnimationName,
    isLayoutTransition,
    isCustomKeyframe,
    hasEnteringAnimation,
    element
  );

  if (shouldFail) {
    return;
  }

  const transform = (props.style as StyleProps)?.transform;

  let animationName = initialAnimationName;

  if (isCustomKeyframe) {
    animationName = createCustomKeyFrameAnimation(
      (config as CustomConfig).definitions as KeyframeDefinitions,
      transform
    );
  } else {
    animationName = transform
      ? createAnimationWithExistingTransform(initialAnimationName, transform)
      : initialAnimationName;
  }

  const animationConfig = getProcessedConfig(
    animationName,
    config as CustomConfig,
    isLayoutTransition || isCustomKeyframe,
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
