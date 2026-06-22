'use strict';
import {
  getCompoundComponentName,
  getPropsBuilder,
  IS_ANDROID,
} from '../../../common';
import type { ShadowNodeWrapper } from '../../../commonTypes';
import type { ViewInfo } from '../../../createAnimatedComponent/commonTypes';
import type { CSSStyle } from '../../types';
import type { ICSSManager } from '../../types/interfaces';
import { filterCSSAndStyleProperties } from '../../utils';
import { setViewStyle } from '../proxy';
import CSSAnimationsManager from './CSSAnimationsManager';
import CSSPseudoStylesManager from './CSSPseudoStylesManager';
import CSSTransitionsManager from './CSSTransitionsManager';

export default class CSSManager implements ICSSManager {
  private readonly cssAnimationsManager: CSSAnimationsManager;
  private readonly cssTransitionsManager: CSSTransitionsManager;
  private readonly cssPseudoStylesManager: CSSPseudoStylesManager;
  private readonly viewTag: number;
  private readonly propsBuilder: ReturnType<typeof getPropsBuilder>;
  /**
   * True if the previous update had CSS transition props attached. On the next
   * update we still need to build `normalizedStyle` only on Android to revert
   * props applied during the transition to correct current values. (fixes
   * https://github.com/software-mansion/react-native-reanimated/issues/9218).
   */
  private hadTransitionLastUpdate = false;

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
    this.cssPseudoStylesManager = new CSSPseudoStylesManager(
      wrapper,
      tag,
      this.propsBuilder
    );
  }

  update(style: CSSStyle): void {
    const [
      animationProperties,
      transitionProperties,
      pseudoStylesBySelector,
      ,
      filteredStyle,
    ] = filterCSSAndStyleProperties(style);

    const hasAnimation = animationProperties !== null;
    const hasTransition = transitionProperties !== null;

    const normalizedStyle =
      hasAnimation ||
      hasTransition ||
      (IS_ANDROID && this.hadTransitionLastUpdate)
        ? this.propsBuilder.build(filteredStyle)
        : undefined;

    const transitionDetached = this.cssTransitionsManager.update(
      transitionProperties,
      normalizedStyle ?? {}
    );

    // Record the committed style as the base so animations and (on Android) a
    // detaching transition can revert to it instead of interpolator defaults.
    if (
      normalizedStyle &&
      (hasAnimation || (IS_ANDROID && transitionDetached))
    ) {
      setViewStyle(this.viewTag, normalizedStyle);
    }

    this.cssAnimationsManager.update(animationProperties);
    this.cssPseudoStylesManager.update(
      pseudoStylesBySelector,
      transitionProperties
    );

    this.hadTransitionLastUpdate = hasTransition;
  }

  unmountCleanup(): void {
    this.cssAnimationsManager.unmountCleanup();
    this.cssTransitionsManager.unmountCleanup();
    this.cssPseudoStylesManager.unmountCleanup();
  }
}
