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
import type { CSSAnimationConfig, CSSAnimationProperties } from '../types';
import type CSSIdManager from './CSSIdManager';

export default class CSSAnimationManager {
  private readonly cssIdManager: CSSIdManager;

  private animationId?: number;
  private serializedAnimationKeyframes?: string;
  private animationConfig?: CSSAnimationConfig;
  private animationProperties?: CSSAnimationProperties;

  constructor(cssIdManager: CSSIdManager) {
    this.cssIdManager = cssIdManager;
  }

  attach(
    animationConfig: CSSAnimationConfig,
    shadowNodeWrapper: ShadowNodeWrapper,
    serializedKeyframes?: string
  ) {
    this.animationId = this.cssIdManager.getId();
    this.serializedAnimationKeyframes =
      serializedKeyframes ?? JSON.stringify(animationConfig.animationName);
    this.animationConfig = animationConfig;

    const { normalizedConfig, animationProperties } =
      normalizeCSSAnimationConfig(animationConfig);

    this.animationProperties = animationProperties;

    registerCSSAnimation(shadowNodeWrapper, this.animationId, normalizedConfig);
  }

  detach() {
    if (this.animationId !== undefined) {
      unregisterCSSAnimation(this.animationId);
      this.animationId = undefined;
      this.serializedAnimationKeyframes = undefined;
      this.animationConfig = undefined;
      this.animationProperties = undefined;
    }
  }

  update(
    wrapper: ShadowNodeWrapper,
    animationConfig: CSSAnimationConfig | null
  ): void {
    if (
      this.animationId !== undefined &&
      animationConfig &&
      this.animationConfig &&
      this.animationProperties
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
        this.animationConfig = animationConfig;
        if (Object.keys(settingsUpdates).length > 0) {
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
