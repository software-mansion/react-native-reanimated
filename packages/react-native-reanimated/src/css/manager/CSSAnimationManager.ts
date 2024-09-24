import type { ShadowNodeWrapper, StyleProps } from '../../commonTypes';
import {
  registerCSSAnimation,
  unregisterCSSAnimation,
  normalizeCSSAnimationConfig,
} from '..';
import type { CSSAnimationConfig } from '..';
import type CSSIdManager from './CSSIdManager';
import type { CSSAnimationProperties } from '../types';

export default class CSSAnimationManager {
  private readonly cssIdManager: CSSIdManager;

  private animationId?: number;
  private serializedAnimationKeyframes?: string;
  private animationConfig?: CSSAnimationConfig;
  private animationProperties?: CSSAnimationProperties;
  private oldStyle?: StyleProps;

  constructor(cssIdManager: CSSIdManager) {
    this.cssIdManager = cssIdManager;
  }

  attach(
    animationConfig: CSSAnimationConfig,
    shadowNodeWrapper: ShadowNodeWrapper,
    style: StyleProps,
    serializedKeyframes?: string
  ) {
    this.animationId = this.cssIdManager.getId();
    this.serializedAnimationKeyframes =
      serializedKeyframes ?? JSON.stringify(animationConfig.animationName);
    this.animationConfig = animationConfig;

    const { normalizedConfig, animationProperties } =
      normalizeCSSAnimationConfig(animationConfig);

    this.animationProperties = animationProperties;

    registerCSSAnimation(
      shadowNodeWrapper,
      this.animationId,
      normalizedConfig,
      style
    );
  }

  detach(revertChanges = false) {
    if (this.animationId !== undefined) {
      unregisterCSSAnimation(this.animationId, revertChanges);
      this.animationId = undefined;
      this.serializedAnimationKeyframes = undefined;
      this.animationConfig = undefined;
      this.animationProperties = undefined;
    }
  }

  update(
    wrapper: ShadowNodeWrapper,
    animationConfig: CSSAnimationConfig | null,
    newStyle: StyleProps
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
        this.detach(true);
        this.attach(animationConfig, wrapper, newStyle, serializedKeyframes);
      }
      // Otherwise, update the existing animation settings
      else {
        // TODO
      }
    } else if (animationConfig) {
      this.attach(animationConfig, wrapper, newStyle);
    } else {
      this.detach(true);
    }
  }
}
