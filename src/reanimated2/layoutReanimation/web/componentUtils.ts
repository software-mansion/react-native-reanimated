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
import { LayoutAnimationType } from '../animationBuilder/commonTypes';
import { setDummyPosition, snapshots } from './componentStyle';

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

export function getReducedMotionFromConfig(config: CustomConfig) {
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
    if (style[i]?.transform) {
      return style[i].transform;
    }
  }
}

export function getProcessedConfig(
  animationName: string,
  animationType: LayoutAnimationType,
  config: CustomConfig,
  initialAnimationName: AnimationNames
): AnimationConfig {
  return {
    animationName: animationName,
    animationType: animationType,
    duration: getDurationFromConfig(
      config,
      animationType === LayoutAnimationType.LAYOUT,
      initialAnimationName
    ),
    delay: getDelayFromConfig(config),
    easing: getEasingFromConfig(config),
    callback: getCallbackFromConfig(config),
    reversed: getReversedFromConfig(config),
  };
}

export function saveSnapshot(element: HTMLElement) {
  snapshots.set(element, element.getBoundingClientRect());
}

export function setElementAnimation(
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
    if (animationConfig.animationType === LayoutAnimationType.ENTERING) {
      _updatePropsJS(
        { visibility: 'initial' },
        { _component: element as ReanimatedHTMLElement }
      );
    }

    element.addEventListener('animationcancel', animationCancelHandler);
    element.style.transform = convertTransformToString(existingTransform);
  };

  if (!(animationName in Animations)) {
    scheduleAnimationCleanup(animationName, duration + delay);
  }
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
  dummy.setAttribute('data-reanimatedDummy', 'true');

  element.style.animationName = '';
  // We hide current element so only its copy with proper animation will be displayed
  element.style.visibility = 'hidden';

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

  const snapshot = snapshots.get(element)!;
  snapshots.set(dummy, snapshot);

  setDummyPosition(dummy, snapshot);

  const originalOnAnimationEnd = dummy.onanimationend;

  dummy.onanimationend = function (event: AnimationEvent) {
    if (parent?.contains(dummy)) {
      dummy.setAttribute('data-reanimatedRemovedAfterAnimation', 'true');
      parent.removeChild(dummy);
    }

    // Given that this function overrides onAnimationEnd, it won't be null
    originalOnAnimationEnd?.call(this, event);
  };

  dummy.addEventListener('animationcancel', () => {
    if (parent?.contains(dummy)) {
      dummy.setAttribute('data-reanimatedRemovedAfterAnimation', 'true');
      parent.removeChild(dummy);
    }
  });
}
