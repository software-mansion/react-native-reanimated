'use strict';
import type { NormalizedCSSTransitionConfig } from '../../platform/native';
import {
  normalizeCSSTransitionProperties,
  styleBuilder,
} from '../../platform/native';
import type { CSSStyle, PlainStyle } from '../../types';
import type { ICSSManager } from '../../types/interfaces';
import { filterCSSAndStyleProperties } from '../../utils';
import NewCSSAnimationsManager from './CSSAnimationsManager';

export default class NewCSSManager implements ICSSManager {
  private jsStyle: PlainStyle | null = null;
  private cssTransition: NormalizedCSSTransitionConfig | null = null;

  private readonly animationsManager = new NewCSSAnimationsManager();

  getProps() {
    return {
      jsStyle: this.jsStyle,
      cssTransition: this.cssTransition,
      cssAnimations: this.cssAnimations,
    };
  }

  update(style: CSSStyle): void {
    const [animationProperties, transitionProperties, filteredStyle] =
      filterCSSAndStyleProperties(style);
    const normalizedStyle = styleBuilder.buildFrom(filteredStyle);

    this.jsStyle = normalizedStyle;
    this.cssTransition =
      transitionProperties &&
      normalizeCSSTransitionProperties(transitionProperties);
    this.animationsManager.update(animationProperties);
  }

  unmountCleanup(): void {
    this.animationsManager.unmountCleanup();
  }
}
