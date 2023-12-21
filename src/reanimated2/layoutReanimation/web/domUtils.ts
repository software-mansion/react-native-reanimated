'use strict';

import { isWindowAvailable } from '../../PlatformChecker';
import { Animations } from './config';
import { setDummyPosition, snapshots } from './componentUtils';
import type { AnimationNames } from './config';

const PREDEFINED_WEB_ANIMATIONS_ID = 'ReanimatedPredefinedWebAnimationsStyle';
const CUSTOM_WEB_ANIMATIONS_ID = 'ReanimatedCustomWebAnimationsStyle';

// Since we cannot remove keyframe from DOM by its name, we have to store its id
const animationNameToIndex = new Map<string, number>();
const animationNameList: string[] = [];

/**
 *  Creates `HTMLStyleElement`, inserts it into DOM and then inserts CSS rules into the stylesheet.
 *  If style element already exists, nothing happens.
 */
export function configureWebLayoutAnimations() {
  if (
    !isWindowAvailable() || // Without this check SSR crashes because document is undefined (NextExample on CI)
    document.getElementById(PREDEFINED_WEB_ANIMATIONS_ID) !== null
  ) {
    return;
  }

  const predefinedAnimationsStyleTag = document.createElement('style');
  predefinedAnimationsStyleTag.id = PREDEFINED_WEB_ANIMATIONS_ID;

  predefinedAnimationsStyleTag.onload = () => {
    if (!predefinedAnimationsStyleTag.sheet) {
      console.error(
        '[Reanimated] Failed to create layout animations stylesheet.'
      );
      return;
    }

    for (const animationName in Animations) {
      predefinedAnimationsStyleTag.sheet.insertRule(
        Animations[animationName as AnimationNames].style
      );
    }
  };

  const customAnimationsStyleTag = document.createElement('style');
  customAnimationsStyleTag.id = CUSTOM_WEB_ANIMATIONS_ID;

  document.head.appendChild(predefinedAnimationsStyleTag);
  document.head.appendChild(customAnimationsStyleTag);
}

export function insertWebAnimation(animationName: string, keyframe: string) {
  // Without this check SSR crashes because document is undefined (NextExample on CI)
  if (!isWindowAvailable()) {
    return;
  }

  const styleTag = document.getElementById(
    CUSTOM_WEB_ANIMATIONS_ID
  ) as HTMLStyleElement;

  if (!styleTag.sheet) {
    console.error(
      '[Reanimated] Failed to create layout animations stylesheet.'
    );
    return;
  }

  styleTag.sheet.insertRule(keyframe, 0);
  animationNameList.unshift(animationName);
  animationNameToIndex.set(animationName, 0);

  for (let i = 1; i < animationNameList.length; ++i) {
    const nextAnimationName = animationNameList[i];
    const nextAnimationIndex = animationNameToIndex.get(nextAnimationName);

    if (nextAnimationIndex === undefined) {
      throw new Error('[Reanimated] Failed to obtain animation index.');
    }

    animationNameToIndex.set(animationNameList[i], nextAnimationIndex + 1);
  }
}

function removeWebAnimation(animationName: string) {
  // Without this check SSR crashes because document is undefined (NextExample on CI)
  if (!isWindowAvailable()) {
    return;
  }

  const styleTag = document.getElementById(
    CUSTOM_WEB_ANIMATIONS_ID
  ) as HTMLStyleElement;

  const currentAnimationIndex = animationNameToIndex.get(animationName);

  if (currentAnimationIndex === undefined) {
    throw new Error('[Reanimated] Failed to obtain animation index.');
  }

  styleTag.sheet?.deleteRule(currentAnimationIndex);
  animationNameList.splice(currentAnimationIndex, 1);
  animationNameToIndex.delete(animationName);

  for (let i = currentAnimationIndex; i < animationNameList.length; ++i) {
    const nextAnimationName = animationNameList[i];
    const nextAnimationIndex = animationNameToIndex.get(nextAnimationName);

    if (nextAnimationIndex === undefined) {
      throw new Error('[Reanimated] Failed to obtain animation index.');
    }

    animationNameToIndex.set(animationNameList[i], nextAnimationIndex - 1);
  }
}

const timeoutScale = 1.25; // We use this value to enlarge timeout duration. It can prove useful if animation lags.
const frameDurationMs = 16; // Just an approximation.
const minimumFrames = 10;

export function scheduleAnimationCleanup(
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

function addChild(child: HTMLElement, parent: Node) {
  child.setAttribute('data-reanimatedRemoveAfterAnimation', 'true');
  parent.appendChild(child);

  console.log();
  setDummyPosition(child, snapshots.get(child)!);

  child.onanimationend = () => {
    parent.removeChild(child);
  };
}

function DFSVisit(node: HTMLElement, root: Node) {
  if (
    node.hasAttribute('data-reanimatedDummy') &&
    !node.hasAttribute('data-reanimatedRemoveAfterAnimation')
  ) {
    addChild(node, root);
    root = node;
  }

  for (let i = 0; i < node.children.length; ++i) {
    DFSVisit(node.children[i] as HTMLElement, root);
  }
}

export function setObserver() {
  const observer = new MutationObserver((mutationsList) => {
    const rootMutation = mutationsList[mutationsList.length - 1];

    for (let i = 0; i < rootMutation.removedNodes.length; ++i) {
      DFSVisit(
        rootMutation.removedNodes[i] as HTMLElement,
        rootMutation.target
      );
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

export function areDOMRectsEqual(r1: DOMRect, r2: DOMRect) {
  // There are 4 more fields, but checking these should suffice
  return (
    r1.x === r2.x &&
    r1.y === r2.y &&
    r1.width === r2.width &&
    r1.height === r2.height
  );
}
