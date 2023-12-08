'use strict';

import type { TransformsStyle } from 'react-native';
import { Animations, TransitionType, WebEasings } from './config';
import type {
  AnimationCallback,
  AnimationConfig,
  AnimationNames,
  CustomConfig,
  WebEasingsNames,
} from './config';
import { convertTransformToString } from './animationParser';
import type { TransitionData } from './animationParser';
import { TransitionGenerator } from './createAnimation';
import { scheduleAnimationCleanup } from './domUtils';
import { _updatePropsJS } from '../../js-reanimated';
import type { ReanimatedHTMLElement } from '../../js-reanimated';
import { ReduceMotion } from '../../commonTypes';
import type { StyleProps } from '../../commonTypes';
import { isReducedMotion } from '../../PlatformChecker';

function getEasingFromConfig(config: CustomConfig): string {
  const easingName =
    config.easingV && config.easingV.name in WebEasings
      ? (config.easingV.name as WebEasingsNames)
      : 'linear';

  return `cubic-bezier(${WebEasings[easingName].toString()})`;
}

function getRandomDelay(maxDelay = 1000) {
  return Math.floor(Math.random() * (maxDelay + 1)) / 1000;
}

function getDelayFromConfig(config: CustomConfig): number {
  const shouldRandomizeDelay = config.randomizeDelay;

  const delay = shouldRandomizeDelay ? getRandomDelay() : 0;

  if (!config.delayV) {
    return delay;
  }

  return shouldRandomizeDelay
    ? getRandomDelay(config.delayV)
    : config.delayV / 1000;
}

function getReducedMotionFromConfig(config: CustomConfig) {
  if (!config.reduceMotionV) {
    return isReducedMotion();
  }

  switch (config.reduceMotionV) {
    case ReduceMotion.Never:
      return false;
    case ReduceMotion.Always:
      return true;
    default:
      return isReducedMotion();
  }
}

function getDurationFromConfig(
  config: CustomConfig,
  isLayoutTransition: boolean,
  animationName: AnimationNames
): number {
  const defaultDuration = isLayoutTransition
    ? 0.3
    : Animations[animationName].duration;

  return config.durationV !== undefined
    ? config.durationV / 1000
    : defaultDuration;
}

function getCallbackFromConfig(config: CustomConfig): AnimationCallback {
  return config.callbackV !== undefined ? config.callbackV : null;
}

function getReversedFromConfig(config: CustomConfig) {
  return !!config.reversed;
}

export function extractTransformFromStyle(style: StyleProps) {
  if (!style) {
    return;
  }

  if (typeof style.transform === 'string') {
    throw new Error('[Reanimated] String transform is currently unsupported.');
  }

  if (!Array.isArray(style)) {
    return style.transform;
  }

  // Only last transform should be considered
  for (let i = style.length - 1; i >= 0; --i) {
    if (style[i].transform) {
      return style[i].transform;
    }
  }
}

export function getProcessedConfig(
  animationName: string,
  config: CustomConfig,
  isLayoutTransition: boolean,
  initialAnimationName: AnimationNames
): AnimationConfig {
  return {
    animationName: animationName,
    duration: getDurationFromConfig(
      config,
      isLayoutTransition,
      initialAnimationName
    ),
    delay: getDelayFromConfig(config),
    easing: getEasingFromConfig(config),
    reduceMotion: getReducedMotionFromConfig(config),
    callback: getCallbackFromConfig(config),
    reversed: getReversedFromConfig(config),
  };
}

export function makeElementVisible(element: HTMLElement) {
  _updatePropsJS(
    { visibility: 'initial' },
    { _component: element as ReanimatedHTMLElement }
  );
}

function setElementAnimation(
  element: HTMLElement,
  animationConfig: AnimationConfig,
  existingTransform?: TransformsStyle['transform']
) {
  const { animationName, duration, delay, easing } = animationConfig;

  element.style.animationName = animationName;
  element.style.animationDuration = `${duration}s`;
  element.style.animationDelay = `${delay}s`;
  element.style.animationTimingFunction = easing;

  element.onanimationend = () => {
    animationConfig.callback?.(true);
    element.removeEventListener('animationcancel', animationCancelHandler);
  };

  const animationCancelHandler = () => {
    animationConfig.callback?.(false);
    element.removeEventListener('animationcancel', animationCancelHandler);
  };

  // Here we have to use `addEventListener` since element.onanimationcancel doesn't work on chrome
  element.onanimationstart = () => {
    element.addEventListener('animationcancel', animationCancelHandler);
    element.style.transform = convertTransformToString(existingTransform);
  };

  scheduleAnimationCleanup(animationName, duration + delay);
}

export function handleEnteringAnimation(
  element: HTMLElement,
  animationConfig: AnimationConfig
) {
  const { delay } = animationConfig;

  // If `delay` === 0, value passed to `setTimeout` will be 0. However, `setTimeout` executes after given amount of time, not exactly after that time
  // Because of that, we have to immediately toggle on the component when the delay is 0.
  if (delay === 0) {
    _updatePropsJS(
      { visibility: 'initial' },
      { _component: element as ReanimatedHTMLElement }
    );
  } else {
    setTimeout(() => {
      _updatePropsJS(
        { visibility: 'initial' },
        { _component: element as ReanimatedHTMLElement }
      );
    }, delay * 1000);
  }

  setElementAnimation(element, animationConfig);
}

export function handleLayoutTransition(
  element: HTMLElement,
  animationConfig: AnimationConfig,
  transitionData: TransitionData,
  existingTransform: TransformsStyle['transform'] | undefined
) {
  const { animationName } = animationConfig;

  let animationType;

  switch (animationName) {
    case 'LinearTransition':
      animationType = TransitionType.LINEAR;
      break;
    case 'SequencedTransition':
      animationType = TransitionType.SEQUENCED;
      break;
    case 'FadingTransition':
      animationType = TransitionType.FADING;
      break;
    default:
      animationType = TransitionType.LINEAR;
      break;
  }

  animationConfig.animationName = TransitionGenerator(
    animationType,
    transitionData,
    existingTransform
  );

  const transformCopy = existingTransform
    ? structuredClone(existingTransform)
    : [];

  // @ts-ignore `existingTransform` cannot be string because in that case
  // we throw error in `extractTransformFromStyle`
  transformCopy.push(transitionData);
  element.style.transform = convertTransformToString(transformCopy);

  setElementAnimation(element, animationConfig, existingTransform);
}

export function handleExitingAnimation(
  element: HTMLElement,
  animationConfig: AnimationConfig
) {
  const parent = element.offsetParent;
  const dummy = element.cloneNode() as HTMLElement;

  // After cloning the element, we want to move all children from original element to its clone. This is because original element
  // will be unmounted, therefore when this code executes in child component, parent will be either empty or removed soon.
  // Using element.cloneNode(true) doesn't solve the problem, because it creates copy of children and we won't be able to set their animations
  //
  // This loop works because appendChild() moves element into its new parent instead of copying it
  while (element.firstChild) {
    dummy.appendChild(element.firstChild);
  }

  setElementAnimation(dummy, animationConfig);
  parent?.appendChild(dummy);

  // We hide current element so only its copy with proper animation will be displayed
  element.style.visibility = 'hidden';

  dummy.style.position = 'absolute';
  dummy.style.top = `${element.offsetTop}px`;
  dummy.style.left = `${element.offsetLeft}px`;
  dummy.style.margin = '0px'; // tmpElement has absolute position, so margin is not necessary

  const originalOnAnimationEnd = dummy.onanimationend;

  dummy.onanimationend = function (event: AnimationEvent) {
    if (parent?.contains(dummy)) {
      parent.removeChild(dummy);
    }

    // Given that this function overrides onAnimationEnd, it won't be null
    originalOnAnimationEnd?.call(this, event);
  };
}
