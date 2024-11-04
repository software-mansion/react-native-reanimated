import type { ShadowNodeWrapper } from '../../commonTypes';
import {
  registerCSSAnimation,
  unregisterCSSAnimation,
  updateCSSAnimation,
} from '../native';
import {
  getNormalizedCSSAnimationSettingsUpdates,
  normalizeCSSAnimationConfig,
} from '../normalization';
import type { CSSAnimationConfig } from '../types';

export default class CSSAnimationManager {
  private animationId?: number;
  private serializedAnimationKeyframes?: string;
  private animationConfig?: CSSAnimationConfig;

  static _nextId = 0;

  private attach(
    animationConfig: CSSAnimationConfig,
    shadowNodeWrapper: ShadowNodeWrapper,
    serializedKeyframes?: string
  ) {
    const normalizedConfig = normalizeCSSAnimationConfig(animationConfig);

    this.animationId = CSSAnimationManager._nextId++;
    this.serializedAnimationKeyframes =
      serializedKeyframes ?? JSON.stringify(animationConfig.animationName);
    this.animationConfig = animationConfig;

    registerCSSAnimation(shadowNodeWrapper, this.animationId, normalizedConfig);
  }

  detach() {
    if (this.animationId !== undefined) {
      unregisterCSSAnimation(this.animationId);
      this.animationId = undefined;
      this.serializedAnimationKeyframes = undefined;
      this.animationConfig = undefined;
    }
  }

  update(
    wrapper: ShadowNodeWrapper,
    animationConfig: CSSAnimationConfig | null
  ): void {
    if (
      this.animationId !== undefined &&
      animationConfig &&
      this.animationConfig
    ) {
      const serializedKeyframes = JSON.stringify(animationConfig.animationName);
      // Replace the animation by the new one if the keyframes have changed
      if (this.serializedAnimationKeyframes !== serializedKeyframes) {
        this.detach();
        this.attach(animationConfig, wrapper, serializedKeyframes);
      }
      // Otherwise, update the existing animation settings
      else {
        const settingsUpdates = getNormalizedCSSAnimationSettingsUpdates(
          this.animationConfig,
          animationConfig
        );

        if (Object.keys(settingsUpdates).length > 0) {
          this.animationConfig = animationConfig;
          updateCSSAnimation(this.animationId, settingsUpdates);
        }
      }
    } else if (animationConfig) {
      this.attach(animationConfig, wrapper);
    } else {
      this.detach();
    }
  }
}
