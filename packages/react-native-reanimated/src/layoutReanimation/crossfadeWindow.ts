'use strict';
import type { HigherOrderAnimation } from '../animation/commonTypes';
import { defineAnimation } from '../animation/util';
import type { Animation, AnimationObject, Timestamp } from '../commonTypes';

export interface CrossfadeWindow {
  start: number;
  end: number;
}

interface CrossfadeWindowAnimation
  extends Animation<CrossfadeWindowAnimation>, HigherOrderAnimation {
  isCrossfadeWindow: true;
  toValue: number;
  startValue: number;
  current: number;
  progress: AnimationObject<number>;
  // A spring can swing back under the end of the window after it passed it.
  passedWindow: boolean;
}

function isCrossfadeWindowAnimation(
  animation: AnimationObject | null
): animation is CrossfadeWindowAnimation {
  'worklet';
  return animation?.isCrossfadeWindow === true;
}

/**
 * Animates `toValue` only while `progress`, an animation from 0 to 1, is inside
 * the window. So the fade has the same timing or spring as the other values of
 * the transition.
 */
export function withCrossfadeWindow(
  toValue: number,
  window: CrossfadeWindow,
  progress: AnimationObject<number>
): CrossfadeWindowAnimation {
  'worklet';
  return defineAnimation<CrossfadeWindowAnimation, AnimationObject<number>>(
    progress,
    (): CrossfadeWindowAnimation => {
      'worklet';
      function onStart(
        animation: CrossfadeWindowAnimation,
        value: number,
        now: Timestamp,
        previousAnimation: AnimationObject | null
      ): void {
        // A restart toward the same value, for example when the target view moves, keeps the fade where it is.
        if (
          isCrossfadeWindowAnimation(previousAnimation) &&
          previousAnimation.toValue === toValue
        ) {
          const previous = previousAnimation;
          animation.progress = previous.progress;
          animation.startValue = previous.startValue;
          animation.passedWindow = previous.passedWindow;
          animation.current = value;
          return;
        }
        animation.startValue = value;
        animation.current = value;
        animation.passedWindow = false;
        if (progress.reduceMotion === undefined) {
          progress.reduceMotion = animation.reduceMotion;
        }
        progress.onStart(progress, 0, now, null);
      }

      function onFrame(
        animation: CrossfadeWindowAnimation,
        now: Timestamp
      ): boolean {
        const inner = animation.progress;
        const finished = inner.onFrame(inner, now);
        const innerProgress = inner.current ?? 0;
        animation.passedWindow =
          animation.passedWindow || finished || innerProgress >= window.end;
        const fraction = animation.passedWindow
          ? 1
          : Math.min(
              Math.max(
                (innerProgress - window.start) / (window.end - window.start),
                0
              ),
              1
            );
        animation.current =
          animation.startValue + (toValue - animation.startValue) * fraction;
        return finished;
      }

      return {
        isHigherOrder: true,
        isCrossfadeWindow: true,
        onStart,
        onFrame,
        toValue,
        startValue: 0,
        current: toValue,
        progress,
        passedWindow: false,
      } as CrossfadeWindowAnimation;
    }
  );
}
