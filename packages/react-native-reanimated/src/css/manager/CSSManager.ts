'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../../commonTypes';
import { adaptViewConfig } from '../../ConfigHelper';
import {
  extractCSSConfigsAndFlattenedStyles,
  removeViewStyle,
  setViewStyle,
} from '..';
import type {
  ICSSManager,
  ViewInfo,
} from '../../createAnimatedComponent/commonTypes';
import CSSTransitionManager from './CSSTransitionManager';
import CSSAnimationManager from './CSSAnimationManager';
import CSSIdManager from './CSSIdManager';

export default class CSSManager implements ICSSManager {
  private readonly cssIdManager = CSSIdManager.getInstance();
  private readonly cssAnimationManager: CSSAnimationManager;
  private readonly cssTransitionManager: CSSTransitionManager;

  constructor() {
    this.cssAnimationManager = new CSSAnimationManager(this.cssIdManager);
    this.cssTransitionManager = new CSSTransitionManager(this.cssIdManager);
  }

  update(
    styles: StyleProps[],
    { shadowNodeWrapper, viewConfig, viewTag }: ViewInfo
  ): void {
    const [animationConfig, transitionConfig, style] =
      extractCSSConfigsAndFlattenedStyles(styles);

    const wrapper = shadowNodeWrapper as ShadowNodeWrapper;
    if (viewConfig) {
      adaptViewConfig(viewConfig);
    }

    setViewStyle(viewTag as number, style);
    this.cssAnimationManager.update(wrapper, animationConfig);
    this.cssTransitionManager.update(wrapper, transitionConfig, style);
  }

  detach(viewTag: number): void {
    removeViewStyle(viewTag);
    this.cssAnimationManager.detach();
    this.cssTransitionManager.detach();
  }
}
