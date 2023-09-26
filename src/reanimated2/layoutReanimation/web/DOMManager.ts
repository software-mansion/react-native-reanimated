import { Animations, WEB_ANIMATIONS_ID, customAnimations } from '.';
import type { AnimationNames } from '.';
/**
 *  Creates `HTMLStyleElement`, inserts it into DOM and then inserts CSS rules into the stylesheet.
 *  If style element already exists, nothing happens.
 */
export function configureWebLayoutAnimations() {
  // TODO: Move outside
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

export function removeWebAnimation(animationName: string) {
  if (customAnimations.has(animationName)) {
    const styleTag = document.getElementById(
      WEB_ANIMATIONS_ID
    ) as HTMLStyleElement;
    styleTag.sheet?.deleteRule(customAnimations.get(animationName) as number);
    customAnimations.delete(animationName);
  }
}
