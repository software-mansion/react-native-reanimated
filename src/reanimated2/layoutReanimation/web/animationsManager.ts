import { Animations, AnimationsData, WebEasings } from '.';
import type { AnimationNames, WebEasingsNames } from '.';
import { convertAnimationObjectToKeyframes } from './animationParser';
import type {
  AnimationData,
  ReanimatedWebTransformProperties,
  TransitionData,
} from './animationParser';
import type { TransformsStyle } from 'react-native';
import type {
  BaseAnimationBuilder,
  EntryExitAnimationFunction,
  ILayoutAnimationBuilder,
} from '..';
import { LayoutAnimationType } from '..';
import type { AnimatedComponentProps } from '../../../createAnimatedComponent/utils';
import type { StyleProps } from '../../commonTypes';

import { LinearTransition } from './transition/Linear.web';
import { SequencedTransition } from './transition/Sequenced.web';
import { FadingTransition } from './transition/Fading.web';

export const WEB_ANIMATIONS_ID = 'ReanimatedWebAnimationsStyle';

export interface AnimationConfig {
  animationName: string;
  duration: number;
  delay: number;
  easing: string;
  callback: (() => void) | null;
}

interface CustomConfig {
  easingV?: () => number;
  durationV?: number;
  delayV?: number;
  randomizeDelay?: boolean;
  callbackV?: () => void;
}

type ConfigType =
  | BaseAnimationBuilder
  | ILayoutAnimationBuilder
  | typeof BaseAnimationBuilder
  | EntryExitAnimationFunction
  | Keyframe
  | CustomConfig;

export enum TransitionType {
  LINEAR,
  SEQUENCED,
  FADING,
}

// Since we cannot remove keyframe from DOM by its name, we have to store its id
const customAnimations = new Map<string, number>();

/**
 *  Creates `HTMLStyleElement`, inserts it into DOM and then inserts CSS rules into the stylesheet.
 *  If style element already exists, nothing happens.
 */
export function configureWebLayoutAnimations() {
  if (document.getElementById(WEB_ANIMATIONS_ID) !== null) {
    return;
  }

  const style = document.createElement('style');
  style.id = WEB_ANIMATIONS_ID;

  style.onload = () => {
    if (!style.sheet) {
      console.error(
        '[Reanimated] Failed to create layout animations stylesheet'
      );
      return;
    }

    for (const animationName in Animations) {
      style.sheet.insertRule(Animations[animationName as AnimationNames].style);
    }
  };

  document.head.appendChild(style);
}

// Translate values are passed as numbers. However, if `translate` property receives number, it will not automatically
// convert it to `px`. Therefore if we want to keep exisitng transform we have to add 'px' suffix to each of translate values
// that are present inside transform.
function addPxToTranslate(
  existingTransform: NonNullable<TransformsStyle['transform']>
) {
  type RNTransformProp = (typeof existingTransform)[number];

  const newTransform = existingTransform.map(
    (transformProp: RNTransformProp) => {
      const newTransformProp: ReanimatedWebTransformProperties = {};
      for (const [key, value] of Object.entries(transformProp)) {
        if (key.includes('translate')) {
          // @ts-ignore After many trials we decided to ignore this error - it says that we cannot use 'key' to index this object.
          // Sadly it doesn't go away after using cast `key as keyof TransformProperties`.
          newTransformProp[key] = `${value}px`;
        } else {
          // @ts-ignore same as above.
          newTransformProp[key] = value;
        }
      }
      return newTransformProp;
    }
  );

  return newTransform;
}

// In order to keep exisitng transform throughout animation, we have to add it to each of keyframe step.
function addExistingTransform(
  newAnimationData: AnimationData,
  newTransform: ReanimatedWebTransformProperties[]
) {
  for (const keyframeStepProperties of Object.values(newAnimationData.style)) {
    if (!keyframeStepProperties.transform) {
      // If transform doesn't exist, we add only transform that already exists
      keyframeStepProperties.transform = newTransform;
    } else {
      // We insert existing transformations before ours.
      Array.prototype.unshift.apply(
        keyframeStepProperties.transform,
        newTransform
      );
    }
  }
}

/**
 *  Modifies default animation by preserving transformations that given element already contains.
 *
 * @param animationName Name of the animation to be modified (e.g. `FadeIn`).
 * @param existingTransform Transform values that element already contains.
 * @returns Animation parsed to keyframe string.
 */
export function createAnimationWithExistingTransform(
  animationName: string,
  existingTransform: NonNullable<TransformsStyle['transform']>
) {
  if (!(animationName in Animations)) {
    return '';
  }

  const keyframeName = generateNextCustomKeyframeName();
  const newAnimationData = structuredClone(AnimationsData[animationName]);

  newAnimationData.name = keyframeName;

  if (typeof existingTransform === 'string') {
    throw new Error('[Reanimated] String transform is currently unsupported.');
  }

  const newTransform = addPxToTranslate(existingTransform);

  addExistingTransform(newAnimationData, newTransform);

  const keyframe = convertAnimationObjectToKeyframes(newAnimationData);

  const styleTag = document.getElementById(
    WEB_ANIMATIONS_ID
  ) as HTMLStyleElement;

  if (styleTag.sheet) {
    const customAnimationId = styleTag.sheet.insertRule(keyframe);
    customAnimations.set(keyframeName, customAnimationId);
  } else {
    console.error(
      '[Reanimated] Failed to insert layout animation into CSS stylesheet'
    );
  }

  return keyframeName;
}

let customKeyframeCounter = 0;

export function generateNextCustomKeyframeName() {
  return `REA${customKeyframeCounter++}`;
}

export function getEasingFromConfig(config: ConfigType): string {
  if (!('easingV' in config)) {
    return `cubic-bezier(${WebEasings.linear.toString()})`;
  }

  const easingName = (
    config.easingV !== undefined &&
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (config as CustomConfig).easingV!.name in WebEasings
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (config as CustomConfig).easingV!.name
      : 'linear'
  ) as WebEasingsNames;

  return `cubic-bezier(${WebEasings[easingName].toString()})`;
}

export function getDelayFromConfig(config: ConfigType): number {
  const shouldRandomizeDelay = (config as CustomConfig).randomizeDelay;

  const delay = shouldRandomizeDelay ? getRandomDelay() : 0;

  if (!('delayV' in config)) {
    return delay;
  }

  if (config.delayV === undefined) {
    return delay;
  }

  return shouldRandomizeDelay
    ? getRandomDelay((config as CustomConfig).delayV)
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (config as CustomConfig).delayV! / 1000;
}

export function getDurationFromConfig(
  config: ConfigType,
  isLayoutTransition: boolean,
  animationName: AnimationNames
): number {
  const defaultDuration = isLayoutTransition
    ? 0.3
    : Animations[animationName].duration;

  if (!('durationV' in config)) {
    return defaultDuration;
  }

  return config.durationV !== undefined
    ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (config as CustomConfig).durationV! / 1000
    : defaultDuration;
}

export function getCallbackFromConfig(config: ConfigType): (() => void) | null {
  if (!('callbackV' in config)) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return config.callbackV !== undefined
    ? (config as CustomConfig).callbackV!
    : null;
}

export function getRandomDelay(maxDelay = 1000) {
  return Math.floor(Math.random() * (maxDelay + 1)) / 1000;
}

export function areDOMRectsEqual(r1: DOMRect, r2: DOMRect) {
  return JSON.stringify(r1) === JSON.stringify(r2);
}

export function setElementAnimation(
  element: HTMLElement,
  animationConfig: AnimationConfig
) {
  const { animationName, duration, delay, easing } = animationConfig;

  element.style.animationName = animationName;
  element.style.animationDuration = `${duration}s`;
  element.style.animationDelay = `${delay}s`;
  element.style.animationTimingFunction = easing;
  element.style.animationFillMode = 'forwards'; // Prevents returning to base state after animation finishes.

  element.onanimationend = () => {
    if (customAnimations.has(animationName)) {
      const styleTag = document.getElementById(
        WEB_ANIMATIONS_ID
      ) as HTMLStyleElement;
      styleTag.sheet?.deleteRule(customAnimations.get(animationName) as number);
      customAnimations.delete(animationName);
    }

    animationConfig.callback?.();
  };
}

/**
 * Creates transition of given type, appends it to stylesheet and returns keyframe name.
 *
 * @param transitionType Type of transition (e.g. LINEAR).
 * @param transitionData Object containing data for transforms (translateX, scaleX,...).
 * @returns Keyframe name that represents transition.
 */
export function TransitionGenerator(
  transitionType: TransitionType,
  transitionData: TransitionData
) {
  const keyframe = generateNextCustomKeyframeName();
  let transition;

  switch (transitionType) {
    case TransitionType.LINEAR:
      transition = LinearTransition(keyframe, transitionData);
      break;
    case TransitionType.SEQUENCED:
      transition = SequencedTransition(keyframe, transitionData);
      break;
    case TransitionType.FADING:
      transition = FadingTransition(keyframe, transitionData);
      break;
  }

  const styleTag = document.getElementById(
    WEB_ANIMATIONS_ID
  ) as HTMLStyleElement;

  if (styleTag.sheet) {
    const customTransitionId = styleTag.sheet.insertRule(transition);
    customAnimations.set(keyframe, customTransitionId);
  } else {
    console.error(
      '[Reanimated] Failed to insert layout animation into CSS stylesheet'
    );
  }

  return keyframe;
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
      element.style.visibility = 'initial';
    }

    console.warn(
      "[Reanimated] Couldn't load entering/exiting animation. Current version supports only predefined animations with modifiers: duration, delay, easing, randomizeDelay."
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
      config,
      isLayoutTransition,
      initialAnimationName as AnimationNames
    ),
    delay: getDelayFromConfig(config),
    easing: getEasingFromConfig(config),
    callback: getCallbackFromConfig(config),
  };

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
        transitionData as TransitionData
      );
      break;
    case LayoutAnimationType.EXITING:
      handleExitingAnimation(element, animationConfig);
      break;
  }
}

export function handleEnteringAnimation(
  element: HTMLElement,
  animationConfig: AnimationConfig
) {
  const { delay } = animationConfig;

  // If `delay` === 0, value passed to `setTimeout` will be 0. However, `setTimeout` executes after given amount of time, not exactly after that time
  // Because of that, we have to immediately toggle on the component when the delay is 0.
  if (delay === 0) {
    element.style.visibility = 'initial';
  } else {
    setTimeout(() => {
      element.style.visibility = 'initial';
    }, delay * 1000);
  }

  setElementAnimation(element, animationConfig);
}

export function handleLayoutTransition(
  element: HTMLElement,
  animationConfig: AnimationConfig,
  transitionData: TransitionData
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
    transitionData
  );

  setElementAnimation(element, animationConfig);
}

export function handleExitingAnimation(
  element: HTMLElement,
  animationConfig: AnimationConfig
) {
  const parent = element.offsetParent;
  const tmpElement = element.cloneNode() as HTMLElement;

  // After cloning the element, we want to move all children from original element to its clone. This is because original element
  // will be unmounted, therefore when this code executes in child component, parent will be either empty or removed soon.
  // Using element.cloneNode(true) doesn't solve the problem, because it creates copy of children and we won't be able to set their animations
  //
  // This loop works because appendChild() moves element into its new parent instead of copying it
  while (element.firstChild) {
    tmpElement.appendChild(element.firstChild);
  }

  setElementAnimation(tmpElement, animationConfig);
  parent?.appendChild(tmpElement);

  // We hide current element so only its copy with proper animation will be displayed
  element.style.visibility = 'hidden';

  tmpElement.style.position = 'absolute';
  tmpElement.style.top = `${element.offsetTop}px`;
  tmpElement.style.left = `${element.offsetLeft}px`;
  tmpElement.style.margin = '0px'; // tmpElement has absolute position, so margin is not necessary

  tmpElement.onanimationend = () => {
    if (parent?.contains(tmpElement)) {
      parent.removeChild(tmpElement);
    }

    const animationName = tmpElement.style.animationName;

    if (customAnimations.has(animationName)) {
      const styleTag = document.getElementById(
        WEB_ANIMATIONS_ID
      ) as HTMLStyleElement;
      styleTag.sheet?.deleteRule(customAnimations.get(animationName) as number);
      customAnimations.delete(animationName);
    }

    animationConfig.callback?.();
  };
}
