'use strict';
import type { ShadowNodeWrapper } from '../../commonTypes';
import { adaptViewConfig } from '../../ConfigHelper';
import type { ViewInfo } from '../../createAnimatedComponent/commonTypes';
import { setViewStyle, styleBuilder } from '../platform/native';
import type { CSSStyle } from '../types';
import type { ICSSManager } from '../types/interfaces';
import { filterCSSAndStyleProperties } from '../utils';
import CSSAnimationsManager from './CSSAnimationsManager';
import CSSTransitionsManager from './CSSTransitionsManager';

export default class CSSManager implements ICSSManager {
  private readonly cssAnimationsManager: CSSAnimationsManager;
  private readonly cssTransitionsManager: CSSTransitionsManager;
  private readonly viewTag: number;
  private isFirstUpdate: boolean = true;

  constructor({ shadowNodeWrapper, viewConfig, viewTag }: ViewInfo) {
    const tag = (this.viewTag = viewTag as number);
    const wrapper = shadowNodeWrapper as ShadowNodeWrapper;

    this.cssAnimationsManager = new CSSAnimationsManager(wrapper, tag);
    this.cssTransitionsManager = new CSSTransitionsManager(wrapper, tag);

    if (viewConfig) {
      adaptViewConfig(viewConfig);
    }
  }

  update(style: CSSStyle): void {
    const [animationProperties, transitionProperties, filteredStyle] =
      filterCSSAndStyleProperties(style);
    const normalizedStyle = styleBuilder.buildFrom(filteredStyle);

    // If the update is called during the first css style update, we won't
    // trigger CSS transitions and set styles before attaching CSS transitions
    if (this.isFirstUpdate && normalizedStyle) {
      setViewStyle(this.viewTag, normalizedStyle);
    }

    this.cssTransitionsManager.update(transitionProperties ?? null);
    this.cssAnimationsManager.update(animationProperties ?? null);

    // If the current update is not the fist one, we want to update CSS
    // animations and transitions first and update the style then to make
    // sure that the new transition is fired with new settings (like duration)
    if (!this.isFirstUpdate && normalizedStyle) {
      setViewStyle(this.viewTag, normalizedStyle);
    }

    this.isFirstUpdate = false;
  }

  unmountCleanup(): void {
    this.cssAnimationsManager.unmountCleanup();
  }
}
