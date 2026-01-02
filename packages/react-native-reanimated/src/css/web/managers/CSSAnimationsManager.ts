'use strict';
import {
  convertPropertiesToArrays,
  type ConvertValuesToArrays,
  kebabizeCamelCase,
  maybeAddSuffix,
} from '../../../common';
import { removeElementAnimation } from '../../../common/web';
import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import type {
  CSSAnimationKeyframes,
  CSSAnimationSettings,
  ExistingCSSAnimationProperties,
  ICSSAnimationsManager,
} from '../../types';
import { normalizeTimeUnit } from '../../utils';
import { processKeyframeDefinitions } from '../animationParser';
import {
  configureWebCSSAnimations,
  insertCSSAnimation,
  removeCSSAnimation,
} from '../domUtils';
import { CSSKeyframesRuleImpl } from '../keyframes';
import { normalizeIterationCount } from '../normalization';
import { maybeAddSuffixes, parseTimingFunction } from '../utils';

const isCSSKeyframesRuleImpl = (
  keyframes: ExistingCSSAnimationProperties['animationName']
): keyframes is CSSKeyframesRuleImpl =>
  typeof keyframes === 'object' && 'processedKeyframes' in keyframes;

type ProcessedAnimation = {
  keyframesRule: CSSKeyframesRuleImpl;
  removable: boolean;
  elapsedTime?: number;
  lastAnimationTime?: number;
  lastPlayState?: string;
};

type ProcessedSettings = ConvertValuesToArrays<CSSAnimationSettings>;

export default class CSSAnimationsManager implements ICSSAnimationsManager {
  private readonly element: ReanimatedHTMLElement;

  // Keys are processed keyframes
  private attachedAnimations: Record<string, ProcessedAnimation> = {};
  private unmountCleanupCalled = false;
  private lastTimelineTime?: number;
  private lastAnimationProperties: ExistingCSSAnimationProperties | null = null;
  private isUpdating = false;
  private resizeObserver: ResizeObserver | null = null;
  private isHidden = false;

  constructor(element: ReanimatedHTMLElement) {
    configureWebCSSAnimations();

    this.element = element;
    this.isHidden = element.offsetParent === null;

    // Use ResizeObserver to detect when the element becomes visible (display: none -> block).
    // This handles the "No Re-render" navigation case efficiently.
    // ResizeObserver notifications are delivered before the paint, avoiding flicker.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.isUpdating) {
          return;
        }

        // Check if element is hidden (display: none results in 0x0 size)
        // using offsetParent as a cheap visibility check
        const isHidden = this.element.offsetParent === null;

        if (!isHidden && this.isHidden) {
          // Transitioned from hidden -> visible.
          // The CSS animation was reset by the browser, so we must force an update
          // to restore the correct delay and maintain continuity.
          if (this.lastAnimationProperties) {
            this.update(this.lastAnimationProperties);
          }
        }
        this.isHidden = isHidden;
      });

      this.resizeObserver.observe(this.element as unknown as Element);
    }
  }

  update(animationProperties: ExistingCSSAnimationProperties | null) {
    if (this.isUpdating) {
      return;
    }
    this.isUpdating = true;
    this.lastAnimationProperties = animationProperties;

    // Use try-finally to ensure isUpdating is reset even if errors occur
    try {
      if (!animationProperties) {
        this.detach();
        return;
      }

      const {
        animationName: definitions,
        animationPlayState: playStates,
        ...animationSettings
      } = convertPropertiesToArrays(animationProperties);

      if (definitions.length === 0) {
        this.detach();
        return;
      }

      const timelineTime = document.timeline.currentTime as number;
      const activeAnimations = this.element.getAnimations
        ? this.element.getAnimations()
        : [];

      const processedAnimations = definitions.map((definition, i) => {
        let processedAnimation: ProcessedAnimation;

        // If the CSSKeyframesRule instance was provided, we can just use it
        if (isCSSKeyframesRuleImpl(definition)) {
          processedAnimation = this.attachedAnimations[
            definition.processedKeyframes
          ] ?? {
            keyframesRule: definition,
            removable: false,
          };
        } else {
          // If keyframes was defined as an object, the additional processing is needed
          const keyframes = definition as CSSAnimationKeyframes;
          const processedKeyframes = processKeyframeDefinitions(keyframes);

          // If the animation with the same keyframes was already attached, we can reuse it
          // Otherwise, we need to create a new CSSKeyframesRule object
          processedAnimation = this.attachedAnimations[processedKeyframes] ?? {
            keyframesRule: new CSSKeyframesRuleImpl(
              keyframes,
              processedKeyframes
            ),
            removable: true,
          };
        }

        const activeAnimation = activeAnimations.find(
          (a) =>
            (a as CSSAnimation).animationName ===
            processedAnimation.keyframesRule.name
        );

        if (processedAnimation.lastAnimationTime !== undefined) {
          // If the animation is paused, we don't want to update the elapsed time
          // because the animation is not supposed to be running.
          const isPaused = playStates?.[i] === 'paused';

          const timeDiff =
            timelineTime - (this.lastTimelineTime ?? timelineTime);

          const recoveringFromHidden =
            this.isHidden && this.element.offsetParent !== null;

          if (activeAnimation && activeAnimation.currentTime !== null) {
            const animationTime = activeAnimation.currentTime as number;

            const wasPaused = processedAnimation.lastPlayState === 'paused';
            const effectiveTimeDiff = wasPaused ? 0 : timeDiff;
            const actualProgress =
              animationTime - processedAnimation.lastAnimationTime;
            const drift = effectiveTimeDiff - actualProgress;

            /*
            console.log('[AntiGravity] Update', {
              drift,
              recoveringFromHidden,
              last: processedAnimation.lastAnimationTime,
              current: animationTime,
              timeDiff,
              elapsed: processedAnimation.elapsedTime
            });
            */
            if (
              processedAnimation.lastAnimationTime !== undefined &&
              (recoveringFromHidden || Math.abs(drift) > 50)
            ) {
              // The animation was restarted relative to the last time we checked
              // (e.g. because the element was hidden and shown again)
              // OR the animation is lagging behind real time (frozen in background).
              // We want to shift the delay so that it looks like the animation
              // continued from the correct point.
              processedAnimation.elapsedTime =
                (processedAnimation.elapsedTime ?? 0) +
                (processedAnimation.lastAnimationTime ?? 0) -
                animationTime +
                effectiveTimeDiff;
            }

            processedAnimation.lastAnimationTime = animationTime;
          } else if (!isPaused) {
            // If the animation is not active (was removed by the browser, e.g.
            // because display: none was set), we still want to update its
            // elapsed time so that when it starts again, it continues from the
            // correct point.

            if (recoveringFromHidden) {
              const wasPaused = processedAnimation.lastPlayState === 'paused';
              processedAnimation.elapsedTime =
                (processedAnimation.elapsedTime ?? 0) +
                (processedAnimation.lastAnimationTime ?? 0) +
                (wasPaused ? 0 : timeDiff);
              processedAnimation.lastAnimationTime = 0;
            } else {
              processedAnimation.elapsedTime =
                (processedAnimation.elapsedTime ?? 0) + timeDiff;
            }

            // processedAnimation.lastAnimationTime = 0; // Don't reset
          } else if (activeAnimation) {
            processedAnimation.lastAnimationTime =
              (activeAnimation.currentTime as number) ?? 0;
          } else {
            // processedAnimation.lastAnimationTime = 0; // Don't reset
          }

          processedAnimation.lastPlayState = isPaused ? 'paused' : 'running';
        } else if (activeAnimation) {
          // First time seeing this animation.
          // Check if this is actually a recovery scenario (Manager was active before).
          const animationTime = (activeAnimation.currentTime as number) ?? 0;
          const timeDiff =
            timelineTime - (this.lastTimelineTime ?? timelineTime);
          const isPaused = playStates?.[i] === 'paused';

          if (
            this.lastTimelineTime !== undefined &&
            timeDiff > 50 &&
            !isPaused
          ) {
            // Manager has history, but animation is new. Assume recovery/restart.
            // Apply the same correction logic as re-renders.
            // Only apply if NOT paused - paused animations shouldn't accumulate time.
            processedAnimation.elapsedTime =
              (processedAnimation.elapsedTime ?? 0) + timeDiff - animationTime;
          }

          processedAnimation.lastAnimationTime = animationTime;
          processedAnimation.lastPlayState = isPaused ? 'paused' : 'running';
        } else {
          // processedAnimation.lastAnimationTime = 0; // Don't reset
        }

        return processedAnimation;
      });

      this.lastTimelineTime = timelineTime;
      this.unmountCleanupCalled = false;
      this.updateAttachedAnimations(processedAnimations);

      // We request the next frame to update the animations if the element is not hidden
      // We check offsetParent directly because this.isHidden might be stale (it's updated in finally)
      if (this.element.offsetParent === null) {
        return;
      }
      // We request the next frame to update the animations if the element is not hidden
      this.setElementAnimations(processedAnimations, {
        ...animationSettings,
        animationPlayState: playStates,
      });
    } finally {
      this.isUpdating = false;
      this.isHidden = this.element.offsetParent === null;
    }
  }

  unmountCleanup(): void {
    if (!this.unmountCleanupCalled) {
      this.unmountCleanupCalled = true;
      // We use setTimeout to ensure that the animation is removed after the
      // component is unmounted (it puts the detach call at the end of the event loop)
      // We just remove the animation definition from the style sheet as there is no
      // need to clean up view props if it is removed from the DOM.
      setTimeout(() => {
        this.removeAnimationsFromStyleSheet(
          Object.values(this.attachedAnimations)
        );
        // this.attachedAnimations = {};
      });
    }
  }

  private detach() {
    const attachedAnimations = Object.values(this.attachedAnimations);

    if (attachedAnimations.length === 0) {
      return;
    }

    removeElementAnimation(this.element);

    this.removeAnimationsFromStyleSheet(attachedAnimations);
    this.unmountCleanupCalled = false;
    // this.attachedAnimations = {}; // Don't clear state on detach, it might be a temporary unmount/hide
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.lastAnimationProperties = null;
  }

  private updateAttachedAnimations(processedAnimations: ProcessedAnimation[]) {
    const newAttachedAnimations: Record<string, ProcessedAnimation> = {};

    processedAnimations.forEach((processedAnimation) => {
      const rule = processedAnimation.keyframesRule;
      if (rule.processedKeyframes) {
        // We always call insert as it will insert animation only if it doesn't exist
        insertCSSAnimation(rule.name, rule.processedKeyframes);
      }
      newAttachedAnimations[rule.processedKeyframes] = processedAnimation;
    });

    Object.values(this.attachedAnimations).forEach(
      ({ keyframesRule: rule, removable }) => {
        if (
          removable &&
          rule.processedKeyframes &&
          !newAttachedAnimations[rule.processedKeyframes]
        ) {
          removeCSSAnimation(rule.name);
        }
      }
    );

    this.attachedAnimations = newAttachedAnimations;
  }

  private setElementAnimations(
    processedAnimations: ProcessedAnimation[],
    animationSettings: ProcessedSettings
  ) {
    this.element.style.animationName = processedAnimations
      .map(({ keyframesRule: { name } }) => name)
      .join(',');

    this.element.style.animationDuration = maybeAddSuffixes(
      animationSettings,
      'animationDuration',
      'ms'
    ).join(',');

    const animationDelays = animationSettings.animationDelay ?? [];
    this.element.style.animationDelay = processedAnimations
      .map(({ elapsedTime }, i) => {
        const providedDelay = animationDelays[i] ?? 0;
        return maybeAddSuffix(
          elapsedTime
            ? (normalizeTimeUnit(providedDelay) ?? 0) - elapsedTime
            : providedDelay,
          'ms'
        );
      })
      .join(',');

    if (animationSettings.animationIterationCount) {
      this.element.style.animationIterationCount =
        animationSettings.animationIterationCount
          .map(normalizeIterationCount)
          .join(',');
    }

    if (animationSettings.animationDirection) {
      this.element.style.animationDirection =
        animationSettings.animationDirection.map(kebabizeCamelCase).join(',');
    }

    if (animationSettings.animationFillMode) {
      this.element.style.animationFillMode =
        animationSettings.animationFillMode.join(',');
    }

    if (animationSettings.animationPlayState) {
      this.element.style.animationPlayState =
        animationSettings.animationPlayState.join(',');
    }

    if (animationSettings.animationTimingFunction) {
      this.element.style.animationTimingFunction = parseTimingFunction(
        animationSettings.animationTimingFunction
      );
    }
  }

  private removeAnimationsFromStyleSheet(animations: ProcessedAnimation[]) {
    animations.forEach(
      ({ keyframesRule: { name, processedKeyframes }, removable }) => {
        if (removable && processedKeyframes) {
          removeCSSAnimation(name);
        }
      }
    );
  }
}
