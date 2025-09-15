'use strict';

import { logger } from '../../common';
import { LayoutAnimationType } from '../../commonTypes';
import { EasingNameSymbol } from '../../Easing';
import { Keyframe } from '../animationBuilder';
import { makeElementVisible } from './componentStyle';
import { getProcessedConfig, handleExitingAnimation, handleLayoutTransition, maybeModifyStyleForKeyframe, setElementAnimation } from './componentUtils';
import { Animations } from './config';
import { createAnimationWithInitialValues, createCustomKeyFrameAnimation } from './createAnimation';
import { areDOMRectsEqual } from './domUtils';
function chooseConfig(animationType, props) {
  const config = animationType === LayoutAnimationType.ENTERING ? props.entering : animationType === LayoutAnimationType.EXITING ? props.exiting : animationType === LayoutAnimationType.LAYOUT ? props.layout : null;
  return config;
}
function checkUndefinedAnimationFail(initialAnimationName, needsCustomization) {
  // This prevents crashes if we try to set animations that are not defined.
  // We don't care about layout transitions or custom keyframes since they're created dynamically
  if (initialAnimationName in Animations || needsCustomization) {
    return false;
  }
  logger.warn("Couldn't load entering/exiting animation. Current version supports only predefined animations with modifiers: duration, delay, easing, randomizeDelay, withCallback, reducedMotion.");
  return true;
}
function maybeReportOverwrittenProperties(keyframe, styles) {
  const propertyRegex = /([a-zA-Z-]+)(?=:)/g;
  const animationProperties = new Set();
  for (const match of keyframe.matchAll(propertyRegex)) {
    animationProperties.add(match[1]);
  }
  const commonProperties = Array.from(styles).filter(style => animationProperties.has(style));
  if (commonProperties.length === 0) {
    return;
  }
  logger.warn(`${commonProperties.length === 1 ? 'Property' : 'Properties'} [${commonProperties.join(', ')}] may be overwritten by a layout animation. Please wrap your component with an animated view and apply the layout animation on the wrapper.`);
}
function chooseAction(animationType, animationConfig, element, transitionData) {
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
function tryGetAnimationConfig(props, animationType) {
  const config = chooseConfig(animationType, props);
  if (!config) {
    return null;
  }
  const isLayoutTransition = animationType === LayoutAnimationType.LAYOUT;
  const isCustomKeyframe = config instanceof Keyframe;
  const hasInitialValues = config.initialValues !== undefined;
  let animationName;
  if (isCustomKeyframe) {
    animationName = createCustomKeyFrameAnimation(config.definitions);
  } else if (typeof config === 'function') {
    animationName = config.presetName;
  } else {
    animationName = config.constructor.presetName;
  }
  if (hasInitialValues) {
    animationName = createAnimationWithInitialValues(animationName, config.initialValues);
  }
  const shouldFail = checkUndefinedAnimationFail(animationName, isLayoutTransition || isCustomKeyframe || hasInitialValues);
  if (shouldFail) {
    return null;
  }
  if (isCustomKeyframe) {
    const keyframeTimestamps = Object.keys(config.definitions);
    if (!(keyframeTimestamps.includes('100') || keyframeTimestamps.includes('to'))) {
      logger.warn(`Neither '100' nor 'to' was specified in Keyframe definition. This may result in wrong final position of your component. One possible solution is to duplicate last timestamp in definition as '100' (or 'to')`);
    }
  }
  const animationConfig = getProcessedConfig(animationName, animationType, config);
  return animationConfig;
}
export function startWebLayoutAnimation(props, element, animationType, transitionData) {
  const animationConfig = tryGetAnimationConfig(props, animationType);
  maybeModifyStyleForKeyframe(element, props.entering);
  if (animationConfig?.animationName in Animations) {
    maybeReportOverwrittenProperties(Animations[animationConfig?.animationName].style, element.style);
  }
  if (animationConfig) {
    chooseAction(animationType, animationConfig, element, transitionData);
  } else {
    makeElementVisible(element, 0);
  }
}
export function tryActivateLayoutTransition(props, element, snapshot) {
  if (!props.layout) {
    return;
  }
  const rect = element.getBoundingClientRect();
  if (areDOMRectsEqual(rect, snapshot)) {
    return;
  }
  const enteringAnimation = props.layout.enteringV?.presetName;
  const exitingAnimation = props.layout.exitingV?.presetName;
  const deltaX = (snapshot.width - rect.width) / 2;
  const deltaY = (snapshot.height - rect.height) / 2;
  const transitionData = {
    translateX: snapshot.x - rect.x + deltaX,
    translateY: snapshot.y - rect.y + deltaY,
    scaleX: snapshot.width / rect.width,
    scaleY: snapshot.height / rect.height,
    reversed: false,
    // This field is used only in `SequencedTransition`, so by default it will be false
    easingX: props.layout.easingXV?.[EasingNameSymbol] ?? 'ease',
    easingY: props.layout.easingYV?.[EasingNameSymbol] ?? 'ease',
    entering: enteringAnimation,
    exiting: exitingAnimation
  };
  startWebLayoutAnimation(props, element, LayoutAnimationType.LAYOUT, transitionData);
}
//# sourceMappingURL=animationsManager.js.map