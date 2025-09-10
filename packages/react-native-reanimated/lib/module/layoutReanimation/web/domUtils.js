'use strict';

import { IS_WINDOW_AVAILABLE, logger, ReanimatedError } from "../../common/index.js";
import { setElementPosition, snapshots } from "./componentStyle.js";
import { Animations } from "./config.js";
const PREDEFINED_WEB_ANIMATIONS_ID = 'ReanimatedPredefinedWebAnimationsStyle';
const CUSTOM_WEB_ANIMATIONS_ID = 'ReanimatedCustomWebAnimationsStyle';

// Since we cannot remove keyframe from DOM by its name, we have to store its id
const animationNameToIndex = new Map();
const animationNameList = [];
let isObserverSet = false;

/**
 * Creates `HTMLStyleElement`, inserts it into DOM and then inserts CSS rules
 * into the stylesheet. If style element already exists, nothing happens.
 */
export function configureWebLayoutAnimations() {
  if (!IS_WINDOW_AVAILABLE ||
  // Without this check SSR crashes because document is undefined (NextExample on CI)
  document.getElementById(PREDEFINED_WEB_ANIMATIONS_ID) !== null) {
    return;
  }
  const predefinedAnimationsStyleTag = document.createElement('style');
  predefinedAnimationsStyleTag.id = PREDEFINED_WEB_ANIMATIONS_ID;
  predefinedAnimationsStyleTag.onload = () => {
    if (!predefinedAnimationsStyleTag.sheet) {
      logger.error('Failed to create layout animations stylesheet.');
      return;
    }
    for (const animationName in Animations) {
      predefinedAnimationsStyleTag.sheet.insertRule(Animations[animationName].style);
    }
  };
  const customAnimationsStyleTag = document.createElement('style');
  customAnimationsStyleTag.id = CUSTOM_WEB_ANIMATIONS_ID;
  document.head.appendChild(predefinedAnimationsStyleTag);
  document.head.appendChild(customAnimationsStyleTag);
}
export function insertWebAnimation(animationName, keyframe) {
  // Without this check SSR crashes because document is undefined (NextExample on CI)
  if (!IS_WINDOW_AVAILABLE) {
    return;
  }
  const styleTag = document.getElementById(CUSTOM_WEB_ANIMATIONS_ID);
  if (!styleTag.sheet) {
    logger.error('Failed to create layout animations stylesheet.');
    return;
  }
  styleTag.sheet.insertRule(keyframe, 0);
  animationNameList.unshift(animationName);
  animationNameToIndex.set(animationName, 0);
  for (let i = 1; i < animationNameList.length; ++i) {
    const nextAnimationName = animationNameList[i];
    const nextAnimationIndex = animationNameToIndex.get(nextAnimationName);
    if (nextAnimationIndex === undefined) {
      throw new ReanimatedError('Failed to obtain animation index.');
    }
    animationNameToIndex.set(animationNameList[i], nextAnimationIndex + 1);
  }
}
function removeWebAnimation(animationName, animationRemoveCallback) {
  // Without this check SSR crashes because document is undefined (NextExample on CI)
  if (!IS_WINDOW_AVAILABLE) {
    return;
  }
  const styleTag = document.getElementById(CUSTOM_WEB_ANIMATIONS_ID);
  const currentAnimationIndex = animationNameToIndex.get(animationName);
  if (currentAnimationIndex === undefined) {
    throw new ReanimatedError('Failed to obtain animation index.');
  }
  animationRemoveCallback();
  styleTag.sheet?.deleteRule(currentAnimationIndex);
  animationNameList.splice(currentAnimationIndex, 1);
  animationNameToIndex.delete(animationName);
  for (let i = currentAnimationIndex; i < animationNameList.length; ++i) {
    const nextAnimationName = animationNameList[i];
    const nextAnimationIndex = animationNameToIndex.get(nextAnimationName);
    if (nextAnimationIndex === undefined) {
      throw new ReanimatedError('Failed to obtain animation index.');
    }
    animationNameToIndex.set(animationNameList[i], nextAnimationIndex - 1);
  }
}
const timeoutScale = 5; // We use this value to enlarge timeout duration. It can prove useful if animation lags.
const frameDurationMs = 16; // Just an approximation.
const minimumFrames = 10;
export function scheduleAnimationCleanup(animationName, animationDuration, animationRemoveCallback) {
  // If duration is very short, we want to keep remove delay to at least 10 frames
  // In our case it is exactly 160/1099 s, which is approximately 0.15s
  const timeoutValue = Math.max(animationDuration * timeoutScale * 1000, animationDuration + frameDurationMs * minimumFrames);
  setTimeout(() => removeWebAnimation(animationName, animationRemoveCallback), timeoutValue);
}
function reattachElementToAncestor(child, parent) {
  const childSnapshot = snapshots.get(child);
  if (!childSnapshot) {
    logger.error('Failed to obtain snapshot.');
    return;
  }

  // We use that so we don't end up in infinite loop
  child.removedAfterAnimation = true;
  parent.appendChild(child);
  setElementPosition(child, childSnapshot);
  const originalOnAnimationEnd = child.onanimationend;
  child.onanimationend = function (event) {
    parent.removeChild(child);

    // Given that this function overrides onAnimationEnd, it won't be null
    originalOnAnimationEnd?.call(this, event);
  };
}
function findDescendantWithExitingAnimation(node, root) {
  // Node could be something else than HTMLElement, for example TextNode (treated as plain text, not as HTML object),
  // therefore it won't have children prop and calling Array.from(node.children) will cause error.
  if (!(node instanceof HTMLElement)) {
    return;
  }
  if (node.reanimatedDummy && node.removedAfterAnimation === undefined) {
    reattachElementToAncestor(node, root);
  }
  const children = Array.from(node.children);
  for (let i = 0; i < children.length; ++i) {
    findDescendantWithExitingAnimation(children[i], root);
  }
}
function checkIfScreenWasChanged(mutationTarget) {
  let reactFiberKey = '__reactFiber';
  for (const key of Object.keys(mutationTarget)) {
    if (key.startsWith('__reactFiber')) {
      reactFiberKey = key;
      break;
    }
  }
  return mutationTarget[reactFiberKey]?.child?.memoizedProps?.navigation !== undefined;
}
export function addHTMLMutationObserver() {
  if (isObserverSet || !IS_WINDOW_AVAILABLE) {
    return;
  }
  isObserverSet = true;
  const observer = new MutationObserver(mutationsList => {
    const rootMutation = mutationsList[mutationsList.length - 1];
    if (checkIfScreenWasChanged(rootMutation.target)) {
      return;
    }
    for (let i = 0; i < rootMutation.removedNodes.length; ++i) {
      findDescendantWithExitingAnimation(rootMutation.removedNodes[i], rootMutation.target);
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
export function areDOMRectsEqual(r1, r2) {
  // There are 4 more fields, but checking these should suffice
  return r1.x === r2.x && r1.y === r2.y && r1.width === r2.width && r1.height === r2.height;
}
//# sourceMappingURL=domUtils.js.map