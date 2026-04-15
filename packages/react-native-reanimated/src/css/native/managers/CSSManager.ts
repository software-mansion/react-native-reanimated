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
import CSSTransitionsManager from './CSSTransitionsManager';

export default class CSSManager implements ICSSManager {
  private readonly cssAnimationsManager: CSSAnimationsManager;
  private readonly cssTransitionsManager: CSSTransitionsManager;
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
  }

  update(style: CSSStyle): void {
    const [animationProperties, transitionProperties, filteredStyle] =
      filterCSSAndStyleProperties(style);

    const hasAnimation = animationProperties !== null;
    const hasTransition = transitionProperties !== null;

    const normalizedStyle =
      hasAnimation ||
      hasTransition ||
      (IS_ANDROID && this.hadTransitionLastUpdate)
        ? this.propsBuilder.build(filteredStyle)
        : undefined;

    if (
      normalizedStyle &&
      (hasAnimation ||
        // We also need to update the current style on Android when the
        // transition is detached.
        (IS_ANDROID && !hasTransition && this.hadTransitionLastUpdate))
    ) {
      setViewStyle(this.viewTag, normalizedStyle);
    }

    this.cssTransitionsManager.update(
      transitionProperties,
      normalizedStyle ?? {}
    );
    this.cssAnimationsManager.update(animationProperties);

    this.hadTransitionLastUpdate = hasTransition;
  }

  unmountCleanup(): void {
    this.cssAnimationsManager.unmountCleanup();
    this.cssTransitionsManager.unmountCleanup();
  }
}
