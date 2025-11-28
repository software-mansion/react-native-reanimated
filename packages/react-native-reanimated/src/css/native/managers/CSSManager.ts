'use strict';
import type { AnyRecord } from '../../../common';
import { ReanimatedError } from '../../../common';
import type { StyleBuilder } from '../../../common/style';
import type { ShadowNodeWrapper } from '../../../commonTypes';
import type { ViewInfo } from '../../../createAnimatedComponent/commonTypes';
import type { CSSStyle } from '../../types';
import type { ICSSManager } from '../../types/interfaces';
import { filterCSSAndStyleProperties } from '../../utils';
import { setViewStyle } from '../proxy';
import { getStyleBuilder, hasStyleBuilder } from '../registry';
import CSSAnimationsManager from './CSSAnimationsManager';
import CSSTransitionsManager from './CSSTransitionsManager';

export default class CSSManager implements ICSSManager {
  private readonly cssAnimationsManager: CSSAnimationsManager;
  private readonly cssTransitionsManager: CSSTransitionsManager;
  private readonly viewTag: number;
  private readonly viewName: string;
  private readonly styleBuilder: StyleBuilder<AnyRecord> | null = null;
  private isStyleSet = false;

  constructor({ shadowNodeWrapper, viewTag, viewName = 'RCTView' }: ViewInfo) {
    const tag = (this.viewTag = viewTag as number);
    const wrapper = shadowNodeWrapper as ShadowNodeWrapper;

    this.viewName = viewName;
    this.styleBuilder = hasStyleBuilder(viewName)
      ? getStyleBuilder(viewName)
      : null;
    this.cssAnimationsManager = new CSSAnimationsManager(
      wrapper,
      viewName,
      tag
    );
    this.cssTransitionsManager = new CSSTransitionsManager(wrapper, tag);
  }

  update(style: CSSStyle): void {
    const [animationProperties, transitionProperties, filteredStyle] =
      filterCSSAndStyleProperties(style);

    if (!this.styleBuilder && (animationProperties || transitionProperties)) {
      const kind = animationProperties ? 'CSS animations' : 'a cSS transition';
      throw new ReanimatedError(
        `Tried to apply ${kind} to ${this.viewName} which is not supported`
      );
    }

    const normalizedStyle = this.styleBuilder?.buildFrom(filteredStyle) ?? null;

    this.cssTransitionsManager.update(transitionProperties, normalizedStyle);
    this.cssAnimationsManager.update(animationProperties);

    if (normalizedStyle) {
      if (animationProperties) {
        setViewStyle(this.viewTag, normalizedStyle);
        this.isStyleSet = true;
      }
    } else if (this.isStyleSet) {
      setViewStyle(this.viewTag, null);
      this.isStyleSet = false;
    }
  }

  unmountCleanup(): void {
    this.cssAnimationsManager.unmountCleanup();
    this.cssTransitionsManager.unmountCleanup();
  }
}
