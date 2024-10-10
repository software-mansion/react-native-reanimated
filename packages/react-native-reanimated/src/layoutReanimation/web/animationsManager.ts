'use strict';

import type {
  AnimationConfig,
  AnimationNames,
  CustomConfig,
  InitialValuesStyleProps,
  KeyframeDefinitions,
} from './config';
import { Animations } from './config';
import type {
  AnimatedComponentProps,
  LayoutAnimationStaticContext,
} from '../../createAnimatedComponent/commonTypes';
import { LayoutAnimationType } from '../animationBuilder/commonTypes';
import {
  createAnimationWithInitialValues,
  createCustomKeyFrameAnimation,
} from './createAnimation';
import {
  getProcessedConfig,
  handleExitingAnimation,
  handleLayoutTransition,
  maybeModifyStyleForKeyframe,
  setElementAnimation,
} from './componentUtils';
import { areDOMRectsEqual } from './domUtils';
import type { TransitionData } from './animationParser';
import { Keyframe } from '../animationBuilder';
import { makeElementVisible } from './componentStyle';
import { EasingNameSymbol } from '../../Easing';
import type { ReanimatedHTMLElement } from '../../js-reanimated';
import { logger } from '../../logger';

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
  needsCustomization: boolean
) {
  // This prevents crashes if we try to set animations that are not defined.
  // We don't care about layout transitions or custom keyframes since they're created dynamically
  if (initialAnimationName in Animations || needsCustomization) {
    return false;
  }

  logger.warn(
    "Couldn't load entering/exiting animation. Current version supports only predefined animations with modifiers: duration, delay, easing, randomizeDelay, withCallback, reducedMotion."
  );

  return true;
}

function maybeReportOverwrittenProperties(
  keyframe: string,
  styles: CSSStyleDeclaration
) {
  const propertyRegex = /([a-zA-Z-]+)(?=:)/g;
  const animationProperties = new Set();

  for (const match of keyframe.matchAll(propertyRegex)) {
    animationProperties.add(match[1]);
  }

  const commonProperties = Array.from(styles).filter((style) =>
    animationProperties.has(style)
  );

  if (commonProperties.length === 0) {
    return;
  }

  logger.warn(
    `${
      commonProperties.length === 1 ? 'Property' : 'Properties'
    } [${commonProperties.join(
      ', '
    )}] may be overwritten by a layout animation. Please wrap your component with an animated view and apply the layout animation on the wrapper.`
  );
}

function chooseAction(
  animationType: LayoutAnimationType,
  animationConfig: AnimationConfig,
  element: ReanimatedHTMLElement,
  transitionData: TransitionData
) {
  switch (animationType) {
    case LayoutAnimationType.ENTERING:
      setElementAnimation(element, animationConfig, true);
      break;
    case LayoutAnimationType.LAYOUT:
      transitionData.reversed = animationConfig.reversed;
      handleLayoutTransition(element, animationConfig, transitionData);
      break;
    case LayoutAnimationType.EXITING:
      handleExitingAnimation(element, animationConfig);
      break;
  }
}

function tryGetAnimationConfig<ComponentProps extends Record<string, unknown>>(
  props: Readonly<AnimatedComponentProps<ComponentProps>>,
  animationType: LayoutAnimationType
) {
  const config = chooseConfig(animationType, props);
  if (!config) {
    return null;
  }

  type ConstructorWithStaticContext = LayoutAnimationStaticContext &
    typeof config.constructor;

  const isLayoutTransition = animationType === LayoutAnimationType.LAYOUT;
  const isCustomKeyframe = config instanceof Keyframe;
  const hasInitialValues = (config as CustomConfig).initialValues !== undefined;

  let animationName;

  if (isCustomKeyframe) {
    animationName = createCustomKeyFrameAnimation(
      (config as CustomConfig).definitions as KeyframeDefinitions
    );
  } else if (typeof config === 'function') {
    animationName = config.presetName;
  } else {
    animationName = (config.constructor as ConstructorWithStaticContext)
      .presetName;
  }

  if (hasInitialValues) {
    animationName = createAnimationWithInitialValues(
      animationName,
      (config as CustomConfig).initialValues as InitialValuesStyleProps
    );
  }

  const shouldFail = checkUndefinedAnimationFail(
    animationName,
    isLayoutTransition || isCustomKeyframe || hasInitialValues
  );

  if (shouldFail) {
    return null;
  }

  if (isCustomKeyframe) {
    const keyframeTimestamps = Object.keys(
      (config as CustomConfig).definitions as KeyframeDefinitions
    );

    if (
      !(keyframeTimestamps.includes('100') || keyframeTimestamps.includes('to'))
    ) {
      logger.warn(
        `Neither '100' nor 'to' was specified in Keyframe definition. This may result in wrong final position of your component. One possible solution is to duplicate last timestamp in definition as '100' (or 'to')`
      );
    }
  }

  const animationConfig = getProcessedConfig(
    animationName,
    animationType,
    config as CustomConfig
  );

  return animationConfig;
}

export function startWebLayoutAnimation<
  ComponentProps extends Record<string, unknown>,
>(
  props: Readonly<AnimatedComponentProps<ComponentProps>>,
  element: ReanimatedHTMLElement,
  animationType: LayoutAnimationType,
  transitionData?: TransitionData
) {
  const animationConfig = tryGetAnimationConfig(props, animationType);

  maybeModifyStyleForKeyframe(element, props.entering as CustomConfig);

  if ((animationConfig?.animationName as AnimationNames) in Animations) {
    maybeReportOverwrittenProperties(
      Animations[animationConfig?.animationName as AnimationNames].style,
      element.style
    );
  }

  if (animationConfig) {
    chooseAction(
      animationType,
      animationConfig,
      element,
      transitionData as TransitionData
    );
  } else {
    makeElementVisible(element, 0);
  }
}

export function tryActivateLayoutTransition<
  ComponentProps extends Record<string, unknown>,
>(
  props: Readonly<AnimatedComponentProps<ComponentProps>>,
  element: ReanimatedHTMLElement,
  snapshot: DOMRect
) {
  if (!props.layout) {
    return;
  }

  const rect = element.getBoundingClientRect();

  if (areDOMRectsEqual(rect, snapshot)) {
    return;
  }

  const enteringAnimation = (props.layout as CustomConfig).enteringV
    ?.presetName;
  const exitingAnimation = (props.layout as CustomConfig).exitingV?.presetName;

  const transitionData: TransitionData = {
    translateX: snapshot.x - rect.x,
    translateY: snapshot.y - rect.y,
    scaleX: snapshot.width / rect.width,
    scaleY: snapshot.height / rect.height,
    reversed: false, // This field is used only in `SequencedTransition`, so by default it will be false
    easingX:
      (props.layout as CustomConfig).easingXV?.[EasingNameSymbol] ?? 'ease',
    easingY:
      (props.layout as CustomConfig).easingYV?.[EasingNameSymbol] ?? 'ease',
    entering: enteringAnimation,
    exiting: exitingAnimation,
  };

  startWebLayoutAnimation(
    props,
    element,
    LayoutAnimationType.LAYOUT,
    transitionData
  );
}
