'use strict';

import { logger } from '../../common';
import { LayoutAnimationType, ReduceMotion } from '../../commonTypes';
import { EasingNameSymbol } from '../../Easing';
import { _updatePropsJS } from '../../ReanimatedModule/js-reanimated';
import { ReducedMotionManager } from '../../ReducedMotion';
import { Keyframe } from '../animationBuilder';
import { setElementPosition, snapshots } from './componentStyle';
import { Animations, TransitionType } from './config';
import { TransitionGenerator } from './createAnimation';
import { scheduleAnimationCleanup } from './domUtils';
import { getEasingByName, maybeGetBezierEasing, WebEasings } from './Easing.web';
import { prepareCurvedTransition } from './transition/Curved.web';
function getEasingFromConfig(config) {
  if (!config.easingV) {
    return getEasingByName('linear');
  }
  const easingName = config.easingV[EasingNameSymbol];
  if (easingName in WebEasings) {
    return getEasingByName(easingName);
  }
  const bezierEasing = maybeGetBezierEasing(config.easingV);
  if (!bezierEasing) {
    logger.warn(`Selected easing is not currently supported on web. Using linear easing instead.`);
    return getEasingByName('linear');
  }
  return bezierEasing;
}
function getRandomDelay(maxDelay = 1000) {
  return Math.floor(Math.random() * (maxDelay + 1)) / 1000;
}
function getDelayFromConfig(config) {
  const shouldRandomizeDelay = config.randomizeDelay;
  const delay = shouldRandomizeDelay ? getRandomDelay() : 0;
  if (!config.delayV) {
    return delay;
  }
  return shouldRandomizeDelay ? getRandomDelay(config.delayV) : config.delayV / 1000;
}
export function getReducedMotionFromConfig(config) {
  if (!config.reduceMotionV) {
    return ReducedMotionManager.jsValue;
  }
  switch (config.reduceMotionV) {
    case ReduceMotion.Never:
      return false;
    case ReduceMotion.Always:
      return true;
    default:
      return ReducedMotionManager.jsValue;
  }
}
function getDurationFromConfig(config, animationName) {
  // Duration in keyframe has to be in seconds. However, when using `.duration()` modifier we pass it in miliseconds.
  // If `duration` was specified in config, we have to divide it by `1000`, otherwise we return value that is already in seconds.

  const defaultDuration = animationName in Animations ? Animations[animationName].duration : 0.3;
  return config.durationV !== undefined ? config.durationV / 1000 : defaultDuration;
}
function getCallbackFromConfig(config) {
  return config.callbackV !== undefined ? config.callbackV : null;
}
function getReversedFromConfig(config) {
  return !!config.reversed;
}
export function getProcessedConfig(animationName, animationType, config) {
  return {
    animationName,
    animationType,
    duration: getDurationFromConfig(config, animationName),
    delay: getDelayFromConfig(config),
    easing: getEasingFromConfig(config),
    callback: getCallbackFromConfig(config),
    reversed: getReversedFromConfig(config)
  };
}
export function maybeModifyStyleForKeyframe(element, config) {
  if (!(config instanceof Keyframe)) {
    return;
  }

  // We need to set `animationFillMode` to `forwards`, otherwise component will go back to its position.
  // This will result in wrong snapshot
  element.style.animationFillMode = 'forwards';
  for (const timestampRules of Object.values(config.definitions)) {
    if ('originX' in timestampRules || 'originY' in timestampRules) {
      element.style.position = 'absolute';
      return;
    }
  }
}
export function saveSnapshot(element) {
  const rect = element.getBoundingClientRect();
  const snapshot = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    scrollOffsets: getElementScrollValue(element)
  };
  snapshots.set(element, snapshot);
}
export function setElementAnimation(element, animationConfig, shouldSavePosition = false, parent = null) {
  const {
    animationName,
    duration,
    delay,
    easing
  } = animationConfig;
  const configureAnimation = () => {
    element.style.animationName = animationName;
    element.style.animationFillMode = 'backwards';
    element.style.animationDuration = `${duration}s`;
    element.style.animationDelay = `${delay}s`;
    element.style.animationTimingFunction = easing;
  };
  if (animationConfig.animationType === LayoutAnimationType.ENTERING) {
    // On chrome sometimes entering animations flicker. This is most likely caused by animation being interrupted
    // by already started tasks. To avoid flickering, we use `requestAnimationFrame`, which will run callback right before repaint.
    requestAnimationFrame(configureAnimation);
  } else {
    configureAnimation();
  }
  const maybeRemoveElement = () => {
    if (element.reanimatedDummy && parent?.contains(element)) {
      element.removedAfterAnimation = true;
      parent.removeChild(element);
    }
  };
  let wasCallbackCalled = false;
  const maybeCallCallback = finished => {
    if (!wasCallbackCalled && animationConfig.callback) {
      animationConfig.callback(finished);
      wasCallbackCalled = true;
    }
  };
  element.onanimationend = () => {
    if (shouldSavePosition) {
      saveSnapshot(element);
    }
    maybeRemoveElement();
    maybeCallCallback(true);
    element.removeEventListener('animationcancel', animationCancelHandler);
  };
  const animationCancelHandler = () => {
    maybeRemoveElement();
    maybeCallCallback(false);
    element.removeEventListener('animationcancel', animationCancelHandler);
  };

  // Here we have to use `addEventListener` since element.onanimationcancel doesn't work on chrome
  element.onanimationstart = () => {
    if (animationConfig.animationType === LayoutAnimationType.ENTERING) {
      _updatePropsJS({
        visibility: 'initial'
      }, element);
    }
    element.addEventListener('animationcancel', animationCancelHandler);
  };
  if (!(animationName in Animations)) {
    scheduleAnimationCleanup(animationName, duration + delay, () => {
      if (shouldSavePosition) {
        setElementPosition(element, snapshots.get(element));
      }
      maybeRemoveElement();
      maybeCallCallback(false);
    });
  }
}
export function handleLayoutTransition(element, animationConfig, transitionData) {
  const {
    animationName
  } = animationConfig;
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
    case 'JumpingTransition':
      animationType = TransitionType.JUMPING;
      break;
    case 'CurvedTransition':
      animationType = TransitionType.CURVED;
      break;
    case 'EntryExitTransition':
      animationType = TransitionType.ENTRY_EXIT;
      break;
    default:
      animationType = TransitionType.LINEAR;
      break;
  }
  const {
    transitionKeyframeName,
    dummyTransitionKeyframeName
  } = TransitionGenerator(animationType, transitionData);
  animationConfig.animationName = transitionKeyframeName;
  if (animationType === TransitionType.CURVED) {
    const {
      dummy,
      dummyAnimationConfig
    } = prepareCurvedTransition(element, animationConfig, transitionData, dummyTransitionKeyframeName // In `CurvedTransition` it cannot be undefined
    );
    setElementAnimation(dummy, dummyAnimationConfig);
  }
  setElementAnimation(element, animationConfig);
}
function getElementScrollValue(element) {
  let current = element;
  const scrollOffsets = {
    scrollTopOffset: 0,
    scrollLeftOffset: 0
  };
  while (current) {
    if (current.scrollTop !== 0 && scrollOffsets.scrollTopOffset === 0) {
      scrollOffsets.scrollTopOffset = current.scrollTop;
    }
    if (current.scrollLeft !== 0 && scrollOffsets.scrollLeftOffset === 0) {
      scrollOffsets.scrollLeftOffset = current.scrollLeft;
    }
    current = current.parentElement;
  }
  return scrollOffsets;
}
export function handleExitingAnimation(element, animationConfig) {
  const parent = element.offsetParent;
  const dummy = element.cloneNode();
  dummy.reanimatedDummy = true;
  element.style.animationName = '';
  dummy.style.animationName = '';

  // Moving elements in DOM resets their scroll positions
  // so we memorize them here and restore after
  const scrollPositions = new Map();
  const saveScrollPosition = node => {
    scrollPositions.set(node, {
      top: node.scrollTop,
      left: node.scrollLeft
    });
    for (const child of Array.from(node.children)) {
      saveScrollPosition(child);
    }
  };
  saveScrollPosition(element);

  // After cloning the element, we want to move all children from original element to its clone. This is because original element
  // will be unmounted, therefore when this code executes in child component, parent will be either empty or removed soon.
  // Using element.cloneNode(true) doesn't solve the problem, because it creates copy of children and we won't be able to set their animations
  //
  // This loop works because appendChild() moves element into its new parent instead of copying it
  while (element.firstChild) {
    dummy.appendChild(element.firstChild);
  }
  parent?.appendChild(dummy);
  const restoreScrollPosition = node => {
    const scrollPosition = scrollPositions.get(node === dummy ? element : node);
    if (scrollPosition) {
      node.scrollTop = scrollPosition.top;
      node.scrollLeft = scrollPosition.left;
    }
    for (const child of Array.from(node.children)) {
      restoreScrollPosition(child);
    }
  };
  restoreScrollPosition(dummy);
  const snapshot = snapshots.get(element);
  const scrollOffsets = getElementScrollValue(element);

  // Scroll does not trigger snapshotting, therefore if we start exiting animation after
  // scrolling through parent component, dummy will end up in wrong place. In order to fix that
  // we keep last known scroll position in snapshot and then adjust dummy position based on
  // last known scroll offset and current scroll offset

  const currentScrollTopOffset = scrollOffsets.scrollTopOffset;
  const lastScrollTopOffset = snapshot.scrollOffsets.scrollTopOffset;
  if (currentScrollTopOffset !== lastScrollTopOffset) {
    snapshot.top += lastScrollTopOffset - currentScrollTopOffset;
  }
  const currentScrollLeftOffset = scrollOffsets.scrollLeftOffset;
  const lastScrollLeftOffset = snapshot.scrollOffsets.scrollLeftOffset;
  if (currentScrollLeftOffset !== lastScrollLeftOffset) {
    snapshot.left += lastScrollLeftOffset - currentScrollLeftOffset;
  }
  snapshots.set(dummy, snapshot);
  setElementPosition(dummy, snapshot);
  setElementAnimation(dummy, animationConfig, false, parent);
}
//# sourceMappingURL=componentUtils.js.map