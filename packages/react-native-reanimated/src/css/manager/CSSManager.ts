'use strict';
import type { ShadowNodeWrapper, StyleProps } from '../../commonTypes';
import { adaptViewConfig } from '../../ConfigHelper';
import { removeViewStyle, setViewStyle } from '../native';
import type {
  ICSSManager,
  ViewInfo,
} from '../../createAnimatedComponent/commonTypes';
import CSSTransitionManager from './CSSTransitionManager';
import CSSAnimationsManager from './CSSAnimationsManager';
import { extractCSSPropertiesAndFlattenedStyles } from '../normalization';

export default class CSSManager implements ICSSManager {
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

  attach(styles: StyleProps[]): void {
    this.update(styles, true);
  }

  update(styles: StyleProps[], isMount = false): void {
    const [animationProperties, transitionProperties, style] =
      extractCSSPropertiesAndFlattenedStyles(styles);

    // If the update is called during component mount, we won't recognize style
    // changes and treat styles as initial, thus we need to set them before
    // attaching transition and animation
    if (isMount) {
      setViewStyle(this.viewTag, style);
    }

    this.cssTransitionManager.update(transitionProperties);
    this.CSSAnimationsManager.update(animationProperties);

    // If the update is called during component mount, we want to first - update
    // the transition or animation config, and then - set the style (which may
    // trigger the transition)
    if (!isMount) {
      setViewStyle(this.viewTag, style);
    }
  }

  detach(viewTag: number): void {
    this.CSSAnimationsManager.detach();
    this.cssTransitionManager.detach();
    removeViewStyle(viewTag);
  }
}
