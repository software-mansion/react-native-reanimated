'use strict';
import type { AnyRecord } from '../../../common';
import { ReanimatedError } from '../../../common';
import type { StyleBuilder } from '../../../common/style';
import type { ShadowNodeWrapper } from '../../../commonTypes';
import type { ViewInfo } from '../../../createAnimatedComponent/commonTypes';
import CSSAnimationsManager from './CSSAnimationsManager';
import CSSTransitionsManager from './CSSTransitionsManager';
import CSSManagerBase from '../../managers/CSSManagerBase';
import type { CSSStyle } from '../../types';
import type { ICSSManager } from '../../types/interfaces';
import { setViewStyle } from '../proxy';
import { getStyleBuilder, hasStyleBuilder } from '../registry';

export default class CSSManager extends CSSManagerBase implements ICSSManager {
  private readonly viewTag: number;
  private readonly styleBuilder: StyleBuilder<AnyRecord> | null = null;
  private isFirstUpdate: boolean = true;

  constructor({ shadowNodeWrapper, viewTag, viewName = 'RCTView' }: ViewInfo) {
    const wrapper = shadowNodeWrapper as ShadowNodeWrapper;
    const tag = viewTag as number;
    const animationsManager = new CSSAnimationsManager(
      wrapper,
      viewName,
      tag
    );
    const transitionsManager = new CSSTransitionsManager(wrapper, tag);

    super(viewName, animationsManager, transitionsManager);
    this.viewTag = tag;

    this.styleBuilder = hasStyleBuilder(viewName)
      ? getStyleBuilder(viewName)
      : null;
  }

  update(style: CSSStyle): void {
    const [animationProperties, transitionProperties, filteredStyle] =
      this.filterAndValidateStyle(style);

    if (!this.styleBuilder && (animationProperties || transitionProperties)) {
      throw new ReanimatedError(
        `Tried to apply CSS animations to ${this.viewName} which is not supported`
      );
    }

    const normalizedStyle = this.styleBuilder?.buildFrom(filteredStyle);

    // If the update is called during the first css style update, we won't
    // trigger CSS transitions and set styles before attaching CSS transitions
    if (this.isFirstUpdate && normalizedStyle) {
      setViewStyle(this.viewTag, normalizedStyle);
    }

    this.transitionsManager.update(transitionProperties);
    this.animationsManager.update(animationProperties);

    // If the current update is not the fist one, we want to update CSS
    // animations and transitions first and update the style then to make
    // sure that the new transition is fired with new settings (like duration)
    if (!this.isFirstUpdate && normalizedStyle) {
      setViewStyle(this.viewTag, normalizedStyle);
    }

    this.isFirstUpdate = false;
  }
}
