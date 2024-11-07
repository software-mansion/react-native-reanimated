'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../../commonTypes';
import { adaptViewConfig } from '../../ConfigHelper';
import { removeViewStyle, setViewStyle } from '../native';
import type {
  ICSSManager,
  ViewInfo,
} from '../../createAnimatedComponent/commonTypes';
import CSSTransitionManager from './CSSTransitionManager';
import CSSAnimationManager from './CSSAnimationManager';
import { extractCSSConfigsAndFlattenedStyles } from '../normalization';

export default class CSSManager implements ICSSManager {
  private readonly cssAnimationManager: CSSAnimationManager;
  private readonly cssTransitionManager: CSSTransitionManager;

  constructor() {
    this.cssAnimationManager = new CSSAnimationManager();
    this.cssTransitionManager = new CSSTransitionManager();
  }

  attach(styles: StyleProps[], viewInfo: ViewInfo): void {
    this.update(styles, viewInfo, true);
  }

  update(
    styles: StyleProps[],
    { shadowNodeWrapper, viewConfig, viewTag }: ViewInfo,
    isMount = false
  ): void {
    const tag = viewTag as number;
    const [animationConfig, transitionConfig, style] =
      extractCSSConfigsAndFlattenedStyles(styles);
    const wrapper = shadowNodeWrapper as ShadowNodeWrapper;

    // If the update is called during component mount, we won't recognize style
    // changes and treat styles as initial, thus we need to set them before
    // attaching transition and animation
    if (isMount) {
      if (viewConfig) {
        adaptViewConfig(viewConfig);
      }
      setViewStyle(tag, style);
    }

    this.cssTransitionManager.update(wrapper, tag, transitionConfig);
    this.cssAnimationManager.update(wrapper, animationConfig);

    // If the update is called during component mount, we want to first - update
    // the transition or animation config, and then - set the style (which may
    // trigger the transition)
    if (!isMount) {
      setViewStyle(tag, style);
    }
  }

  detach(viewTag: number): void {
    this.cssAnimationManager.detach();
    this.cssTransitionManager.detach();
    removeViewStyle(viewTag);
  }
}
