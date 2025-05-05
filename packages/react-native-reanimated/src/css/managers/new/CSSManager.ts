'use strict';
import { styleBuilder } from '../../platform/native';
import type { CSSStyle, PlainStyle } from '../../types';
import type { ICSSManager } from '../../types/interfaces';
import { filterCSSAndStyleProperties } from '../../utils';
import NewCSSAnimationsManager from './CSSAnimationsManager';
import CSSTransitionManager from './CSSTransitionManager';

export default class NewCSSManager implements ICSSManager {
  private jsStyle: PlainStyle | null = null;

  private readonly animationsManager = new NewCSSAnimationsManager();
  private readonly transitionManager = new CSSTransitionManager();

  getProps() {
    return {
      jsStyle: this.jsStyle,
      cssTransition: this.transitionManager.getConfig(),
      cssAnimations: this.animationsManager.getConfig(),
    };
  }

  update(style: CSSStyle): void {
    const [animationProperties, transitionProperties, filteredStyle] =
      filterCSSAndStyleProperties(style);
    const normalizedStyle = styleBuilder.buildFrom(filteredStyle);

    this.jsStyle = normalizedStyle;
    this.animationsManager.update(animationProperties);
    this.transitionManager.update(transitionProperties);
  }

  unmountCleanup(): void {
    this.animationsManager.unmountCleanup();
  }
}
