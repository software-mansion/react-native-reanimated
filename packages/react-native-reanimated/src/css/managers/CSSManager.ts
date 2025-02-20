'use strict';
import type { ShadowNodeWrapper } from '../../commonTypes';
import { adaptViewConfig } from '../../ConfigHelper';
import type { ViewInfo } from '../../createAnimatedComponent/commonTypes';
import {
  removeViewStyle,
  setViewStyle,
  styleBuilder,
} from '../platform/native';
import type { CSSStyle } from '../types';
import { filterCSSAndStyleProperties } from '../utils';
import CSSAnimationsManager from './CSSAnimationsManager';
import CSSTransitionManager from './CSSTransitionManager';

export default class CSSManager {
  private readonly viewTag: number;
  private readonly CSSAnimationsManager: CSSAnimationsManager;
  private readonly cssTransitionManager: CSSTransitionManager;

  constructor({ shadowNodeWrapper, viewConfig, viewTag }: ViewInfo) {
    const tag = viewTag as number;
    const wrapper = shadowNodeWrapper as ShadowNodeWrapper;

    this.viewTag = tag;
    this.CSSAnimationsManager = new CSSAnimationsManager(wrapper, tag);
    this.cssTransitionManager = new CSSTransitionManager(wrapper, tag);

    if (viewConfig) {
      adaptViewConfig(viewConfig);
    }
  }

  attach(style: CSSStyle): void {
    this.update(style, true);
  }

  update(style: CSSStyle, isMount = false): void {
    const [animationProperties, transitionProperties, filteredStyle] =
      filterCSSAndStyleProperties(style);
    const normalizedStyle = styleBuilder.buildFrom(filteredStyle);

    // If the update is called during component mount, we won't recognize style
    // changes and treat styles as initial, thus we need to set them before
    // attaching transition and animation
    if (isMount && normalizedStyle) {
      setViewStyle(this.viewTag, normalizedStyle);
    }

    this.cssTransitionManager.update(transitionProperties);
    this.CSSAnimationsManager.update(animationProperties);

    // If the update is called during component mount, we want to first - update
    // the transition or animation config, and then - set the style (which may
    // trigger the transition)
    if (!isMount && normalizedStyle) {
      setViewStyle(this.viewTag, normalizedStyle);
    }
  }

  detach(): void {
    this.cssTransitionManager.detach();
    removeViewStyle(this.viewTag);
  }
}
