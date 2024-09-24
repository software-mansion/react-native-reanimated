import type { ShadowNodeWrapper, StyleProps } from '../commonTypes';
import { adaptViewConfig } from '../ConfigHelper';
import {
  extractCSSConfigsAndFlattenedStyles,
  registerCSSAnimation,
  registerCSSTransition,
  unregisterCSSAnimation,
  unregisterCSSTransition,
  updateCSSAnimation,
  updateCSSTransition,
  normalizeAnimationConfig,
  normalizeTransitionConfig,
} from '../css';
import type {
  CSSAnimationConfig,
  CSSAnimationSettings,
  CSSTransitionConfig,
  NormalizedCSSAnimationSettings,
} from '../css';
import type { ICSSManager, ViewInfo } from './commonTypes';

let cssId = 0;

export class CSSManager implements ICSSManager {
  private animationId?: number;
  private serializedAnimationKeyframes?: string;
  private animationConfig?: CSSAnimationConfig;
  private transitionId?: number;

  update(
    styles: StyleProps[],
    { shadowNodeWrapper, viewConfig }: ViewInfo
  ): void {
    const [animationConfig, transitionConfig, style] =
      extractCSSConfigsAndFlattenedStyles(styles);

    const wrapper = shadowNodeWrapper as ShadowNodeWrapper;
    if (viewConfig) {
      adaptViewConfig(viewConfig);
    }

    this.updateAnimation(wrapper, animationConfig, style);
    this.updateTransition(wrapper, transitionConfig, style);
  }

  detach(): void {
    this.detachAnimation();
    this.detachTransition();
  }

  private attachAnimation(
    animationConfig: CSSAnimationConfig,
    shadowNodeWrapper: ShadowNodeWrapper,
    style: StyleProps,
    serializedKeyframes?: string
  ) {
    this.animationId = cssId++;
    this.serializedAnimationKeyframes =
      serializedKeyframes ?? JSON.stringify(animationConfig.animationName);
    this.animationConfig = animationConfig;

    registerCSSAnimation(
      shadowNodeWrapper,
      this.animationId,
      normalizeAnimationConfig(animationConfig),
      style
    );
  }

  private detachAnimation(revertChanges = false) {
    if (this.animationId !== undefined) {
      unregisterCSSAnimation(this.animationId, revertChanges);
      this.animationId = undefined;
      this.serializedAnimationKeyframes = undefined;
      this.animationConfig = undefined;
    }
  }

  private attachTransition(
    transitionConfig: CSSTransitionConfig,
    shadowNodeWrapper: ShadowNodeWrapper,
    style: StyleProps
  ) {
    this.transitionId = cssId++;

    registerCSSTransition(
      shadowNodeWrapper,
      this.transitionId,
      normalizeTransitionConfig(transitionConfig, style),
      style
    );
  }

  private detachTransition() {
    if (this.transitionId !== undefined) {
      unregisterCSSTransition(this.transitionId);
      this.transitionId = undefined;
    }
  }

  private updateAnimation(
    wrapper: ShadowNodeWrapper,
    animationConfig: CSSAnimationConfig | null,
    style: StyleProps
  ) {
    if (
      this.animationId !== undefined &&
      animationConfig &&
      this.animationConfig
    ) {
      const serializedKeyframes = JSON.stringify(animationConfig.animationName);
      // Replace the animation by the new one if the keyframes have changed
      if (this.serializedAnimationKeyframes !== serializedKeyframes) {
        this.detachAnimation(true);
        this.attachAnimation(
          animationConfig,
          wrapper,
          style,
          serializedKeyframes
        );
      }
      // Otherwise, update the existing animation settings
      else {
        // TODO - maybe somehow check if the animation was affected by the component's
        // props update and don't just blindly update it every time
        const updatedSettings =
          this.getUpdatedAnimationSettings(animationConfig);
        Object.assign(this.animationConfig, updatedSettings);
        updateCSSAnimation(this.animationId, updatedSettings, style);
      }
    } else if (animationConfig) {
      this.attachAnimation(animationConfig, wrapper, style);
    } else {
      this.detachAnimation(true);
    }
  }

  private updateTransition(
    wrapper: ShadowNodeWrapper,
    transitionConfig: CSSTransitionConfig | null,
    style: StyleProps
  ) {
    if (this.transitionId !== undefined && transitionConfig) {
      updateCSSTransition(
        this.transitionId,
        // TODO - maybe don't normalize everything on every re-render
        normalizeTransitionConfig(transitionConfig, style),
        style
      );
    } else if (transitionConfig) {
      this.attachTransition(transitionConfig, wrapper, style);
    } else {
      this.detachTransition();
    }
  }

  private getUpdatedAnimationSettings(
    animationConfig: CSSAnimationSettings
  ): Partial<NormalizedCSSAnimationSettings> {
    // TODO - implement
    const updatedSettings: Partial<NormalizedCSSAnimationSettings> = {};
    console.log(animationConfig);
    return updatedSettings;
  }
}
