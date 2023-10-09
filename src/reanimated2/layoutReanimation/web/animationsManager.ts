'use strict';

import type { ReanimatedHTMLElement } from '../../js-reanimated';
import { _updatePropsJS } from '../../js-reanimated';
import type { AnimationConfig, AnimationNames, CustomConfig } from '.';
import { Animations } from '.';
import type { AnimatedComponentProps } from '../../../createAnimatedComponent/utils';
import { LayoutAnimationType } from '../animationBuilder/commonTypes';
import type { TransitionData } from './animationParser';
import type { StyleProps } from '../..//commonTypes';
import { createAnimationWithExistingTransform } from './createAnimation';
import {
  getCallbackFromConfig,
  getDelayFromConfig,
  getDurationFromConfig,
  getEasingFromConfig,
  getReducedMotionFromConfig,
  handleEnteringAnimation,
  handleExitingAnimation,
  handleLayoutTransition,
} from './elementManager';
import { areDOMRectsEqual } from './DOMManager';

export function startWebLayoutAnimation<
  ComponentProps extends Record<string, unknown>
>(
  props: Readonly<AnimatedComponentProps<ComponentProps>>,
  element: HTMLElement,
  animationType: LayoutAnimationType,
  transitionData?: TransitionData
) {
  const config =
    animationType === LayoutAnimationType.ENTERING
      ? props.entering
      : animationType === LayoutAnimationType.EXITING
      ? props.exiting
      : animationType === LayoutAnimationType.LAYOUT
      ? props.layout
      : null;

  if (!config) {
    return;
  }

  const isLayoutTransition = animationType === LayoutAnimationType.LAYOUT;

  const initialAnimationName =
    typeof config === 'function' ? config.name : config.constructor.name;

  // This prevents crashes if we try to set animations that are not defined.
  // We don't care about layout transitions since they're created dynamically
  if (!(initialAnimationName in Animations) && !isLayoutTransition) {
    if (props.entering) {
      _updatePropsJS(
        { visibility: 'initial' },
        { _component: element as ReanimatedHTMLElement }
      );
    }

    console.warn(
      "[Reanimated] Couldn't load entering/exiting animation. Current version supports only predefined animations with modifiers: duration, delay, easing, randomizeDelay, wtihCallback, reducedMotion."
    );
    return;
  }

  const transform = (props.style as StyleProps)?.transform;

  const animationName = transform
    ? createAnimationWithExistingTransform(initialAnimationName, transform)
    : initialAnimationName;

  const animationConfig: AnimationConfig = {
    animationName: animationName,
    duration: getDurationFromConfig(
      config as CustomConfig,
      isLayoutTransition,
      initialAnimationName as AnimationNames
    ),
    delay: getDelayFromConfig(config as CustomConfig),
    easing: getEasingFromConfig(config as CustomConfig),
    reduceMotion: getReducedMotionFromConfig(config as CustomConfig),
    callback: getCallbackFromConfig(config as CustomConfig),
  };

  if (animationConfig.reduceMotion) {
    if (props.entering) {
      _updatePropsJS(
        { visibility: 'initial' },
        { _component: element as ReanimatedHTMLElement }
      );
    }

    return;
  }

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
        transitionData as TransitionData,
        transform
      );
      break;
    case LayoutAnimationType.EXITING:
      handleExitingAnimation(element, animationConfig);
      break;
  }
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
