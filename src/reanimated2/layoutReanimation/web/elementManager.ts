import type { TransformsStyle } from 'react-native';
import { Animations, TransitionType } from '.';
import type { AnimationConfig, AnimationNames, CustomConfig } from '.';
import { LayoutAnimationType } from '..';
import type { AnimatedComponentProps } from '../../../createAnimatedComponent/utils';
import type { TransitionData } from './animationParser';
import {
  TransitionGenerator,
  createAnimationWithExistingTransform,
  getCallbackFromConfig,
  getDelayFromConfig,
  getDurationFromConfig,
  getEasingFromConfig,
  getReducedMotionFromConfig,
} from './animationsManager';
import type { StyleProps } from '../../commonTypes';
import { areDOMRectsEqual, removeWebAnimation } from './DOMManager';

const timeoutScale = 1.25; // We use this value to enlarge timeout duration. It can prove useful if animation lags.
const frameDurationMs = 16; // Just an approximation.
const minimumFrames = 10;

function scheduleAnimationCleanup(
  animationName: string,
  animationDuration: number
) {
  // If duration is very short, we want to keep remove delay to at least 10 frames
  // In our case it is exactly 160/1099 s, which is approximately 0.15s
  const timeoutValue = Math.max(
    animationDuration * timeoutScale * 1000,
    animationDuration + frameDurationMs * minimumFrames
  );

  setTimeout(() => removeWebAnimation(animationName), timeoutValue);
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
  };

  scheduleAnimationCleanup(animationName, duration + delay);
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
      element.style.visibility = 'initial';
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
  transitionData: TransitionData,
  existingTransform?: NonNullable<TransformsStyle['transform']>
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

  setElementAnimation(element, animationConfig);
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
