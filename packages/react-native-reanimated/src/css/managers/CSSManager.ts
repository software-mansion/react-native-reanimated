'use strict';
import type { ShadowNodeWrapper } from '../../commonTypes';
import { adaptViewConfig } from '../../ConfigHelper';
import type { ViewInfo } from '../../createAnimatedComponent/commonTypes';
import {
  markNodeAsRemovable,
  setViewStyle,
  styleBuilder,
} from '../platform/native';
import type { CSSStyle, ICSSManager } from '../types';
import { filterCSSAndStyleProperties } from '../utils';
import CSSAnimationsManager from './CSSAnimationsManager';
import CSSTransitionsManager from './CSSTransitionsManager';

export default class CSSManager implements ICSSManager {
  private readonly viewTag: number;
  private readonly shadowNodeWrapper: ShadowNodeWrapper;
  private readonly cssAnimationsManager: CSSAnimationsManager;
  private readonly cssTransitionsManager: CSSTransitionsManager;

  private isMounted = false;

  constructor({ shadowNodeWrapper, viewConfig, viewTag }: ViewInfo) {
    const tag = viewTag as number;
    const wrapper = shadowNodeWrapper as ShadowNodeWrapper;

    this.viewTag = tag;
    this.shadowNodeWrapper = wrapper;

    this.cssAnimationsManager = new CSSAnimationsManager(wrapper, tag);
    this.cssTransitionsManager = new CSSTransitionsManager(wrapper, tag);

    if (viewConfig) {
      adaptViewConfig(viewConfig);
    }
  }

  update(style: CSSStyle): void {
    this.isMounted = true;
    const [animationProperties, transitionProperties, filteredStyle] =
      filterCSSAndStyleProperties(style);
    const normalizedStyle = styleBuilder.buildFrom(filteredStyle);

    // If the update is called during component mount, we won't recognize style
    // changes and treat styles as initial, thus we need to set them before
    // attaching transition and animation
    if (!this.isMounted && normalizedStyle) {
      setViewStyle(this.viewTag, normalizedStyle);
    }

    this.cssTransitionsManager.update(transitionProperties);
    this.cssAnimationsManager.update(animationProperties);

    // If the update is called during component mount, we want to first - update
    // the transition or animation config, and then - set the style (which may
    // trigger the transition)
    if (this.isMounted && normalizedStyle) {
      setViewStyle(this.viewTag, normalizedStyle);
    }
  }

  unmountCleanup(): void {
    this.isMounted = false;
    this.cssAnimationsManager.unmountCleanup();
    this.cssTransitionsManager.unmountCleanup();
    markNodeAsRemovable(this.shadowNodeWrapper);
  }
}
