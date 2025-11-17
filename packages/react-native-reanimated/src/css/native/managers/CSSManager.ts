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
import { logger } from '../../../common';
import CSSAnimationsManager from './CSSAnimationsManager';
import CSSTransitionsManager from './CSSTransitionsManager';

const UNSUPPORTED_TRANSFORM_PROPS: ReadonlySet<string> = new Set([
  'translate',
  'translateX',
  'translateY',
  'scale',
  'scaleX',
  'scaleY',
  'rotate',
  'rotateX',
  'rotateY',
  'rotateZ',
  'skewX',
  'skewY',
  'matrix',
]);

export default class CSSManager implements ICSSManager {
  private readonly cssAnimationsManager: CSSAnimationsManager;
  private readonly cssTransitionsManager: CSSTransitionsManager;
  private readonly viewTag: number;
  private readonly viewName: string;
  private readonly styleBuilder: StyleBuilder<AnyRecord> | null = null;
  private readonly warnedUnsupportedProps = new Set<string>();
  private isFirstUpdate: boolean = true;

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
      throw new ReanimatedError(
        `Tried to apply CSS animations to ${this.viewName} which is not supported`
      );
    }

    if (__DEV__ && this.styleBuilder) {
      this.warnUnsupportedTransformProps(filteredStyle);
    }

    const normalizedStyle = this.styleBuilder?.buildFrom(filteredStyle);

    // If the update is called during the first css style update, we won't
    // trigger CSS transitions and set styles before attaching CSS transitions
    if (this.isFirstUpdate && normalizedStyle) {
      setViewStyle(this.viewTag, normalizedStyle);
    }

    this.cssTransitionsManager.update(transitionProperties);
    this.cssAnimationsManager.update(animationProperties);

    // If the current update is not the fist one, we want to update CSS
    // animations and transitions first and update the style then to make
    // sure that the new transition is fired with new settings (like duration)
    if (!this.isFirstUpdate && normalizedStyle) {
      setViewStyle(this.viewTag, normalizedStyle);
    }

    this.isFirstUpdate = false;
  }

  unmountCleanup(): void {
    this.cssAnimationsManager.unmountCleanup();
    this.cssTransitionsManager.unmountCleanup();
  }

  private warnUnsupportedTransformProps(style: CSSStyle) {
    for (const prop of Object.keys(style ?? {})) {
      if (
        UNSUPPORTED_TRANSFORM_PROPS.has(prop) &&
        !this.warnedUnsupportedProps.has(prop)
      ) {
        this.warnedUnsupportedProps.add(prop);
        logger.warn(
          `The style property "${prop}" is not supported for ${this.viewName} CSS animations. Use the "transform" property instead.`
        );
      }
    }
  }
}
