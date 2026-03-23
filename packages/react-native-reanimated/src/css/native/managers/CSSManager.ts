'use strict';
import { getCompoundComponentName, getPropsBuilder } from '../../../common';
import type { ShadowNodeWrapper } from '../../../commonTypes';
import type { ViewInfo } from '../../../createAnimatedComponent/commonTypes';
import type { CSSStyle } from '../../types';
import type { ICSSManager } from '../../types/interfaces';
import { filterCSSAndStyleProperties } from '../../utils';
import { setViewStyle } from '../proxy';
import CSSAnimationsManager from './CSSAnimationsManager';
import CSSTransitionsManager from './CSSTransitionsManager';

export default class CSSManager implements ICSSManager {
  private readonly cssAnimationsManager: CSSAnimationsManager;
  private readonly cssTransitionsManager: CSSTransitionsManager;
  private readonly viewTag: number;
  private readonly propsBuilder: ReturnType<typeof getPropsBuilder>;

  constructor(
    { shadowNodeWrapper, viewTag, reactViewName = 'RCTView' }: ViewInfo,
    componentDisplayName = ''
  ) {
    const tag = (this.viewTag = viewTag as number);
    const wrapper = shadowNodeWrapper as ShadowNodeWrapper;

    const compoundComponentName = getCompoundComponentName(
      reactViewName,
      componentDisplayName
    );

    this.propsBuilder = getPropsBuilder(compoundComponentName);
    this.cssAnimationsManager = new CSSAnimationsManager(
      wrapper,
      tag,
      compoundComponentName
    );
    this.cssTransitionsManager = new CSSTransitionsManager(wrapper, tag);
  }

  update(style: CSSStyle): void {
    const [animationProperties, transitionProperties, filteredStyle] =
      filterCSSAndStyleProperties(style);

    const hasAnimationOrTransition =
      animationProperties !== null || transitionProperties !== null;
    const normalizedStyle = hasAnimationOrTransition
      ? this.propsBuilder.build(filteredStyle)
      : undefined;

    // We need to update view style only for animations (e.g. when a property is
    // specified only in a subset of keyframes and start/end value comes from style).
    if (normalizedStyle && animationProperties) {
      setViewStyle(this.viewTag, normalizedStyle);
    }

    this.cssTransitionsManager.update(
      transitionProperties,
      normalizedStyle ?? {}
    );
    this.cssAnimationsManager.update(animationProperties);
  }

  unmountCleanup(): void {
    this.cssAnimationsManager.unmountCleanup();
    this.cssTransitionsManager.unmountCleanup();
  }
}
