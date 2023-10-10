'use strict';

import { Animations, customAnimations } from './config';
import type { AnimationNames } from './config';

const WEB_ANIMATIONS_ID = 'ReanimatedWebAnimationsStyle';

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

export function insertWebAnimation(animationName: string, keyframe: string) {
  const styleTag = document.getElementById(
    WEB_ANIMATIONS_ID
  ) as HTMLStyleElement;

  if (!styleTag.sheet) {
    console.error('[Reanimated] Failed to create layout animations stylesheet');
    return;
  }

  const customTransitionId = styleTag.sheet.insertRule(keyframe);
  customAnimations.set(animationName, customTransitionId);
}

function removeWebAnimation(animationName: string) {
  if (!customAnimations.has(animationName)) {
    return;
  }

  const styleTag = document.getElementById(
    WEB_ANIMATIONS_ID
  ) as HTMLStyleElement;

  styleTag.sheet?.deleteRule(customAnimations.get(animationName) as number);
  customAnimations.delete(animationName);
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

export function areDOMRectsEqual(r1: DOMRect, r2: DOMRect) {
  // There are 4 more fields, but checking these should suffice
  return (
    r1.x === r2.x &&
    r1.y === r2.y &&
    r1.width === r2.width &&
    r1.height === r2.height
  );
}
