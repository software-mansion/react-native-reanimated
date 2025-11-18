'use strict';
import type { AnyRecord, PlainStyle } from '../../common';
import {
  isReactComponentName,
  logger,
  UNSUPPORTED_TRANSFORM_PROPS,
} from '../../common';
import type {
  ExistingCSSAnimationProperties,
  CSSTransitionProperties,
  CSSStyle,
} from '../types';
import type {
  ICSSAnimationsManager,
  ICSSTransitionsManager,
} from '../types/interfaces';
import { filterCSSAndStyleProperties } from '../utils';

const UNSUPPORTED_TRANSFORM_PROPS_SET = new Set<string>(
  UNSUPPORTED_TRANSFORM_PROPS
);

type FilterResult = [
  ExistingCSSAnimationProperties | null,
  CSSTransitionProperties | null,
  PlainStyle,
];

export default abstract class CSSManagerBase {
  private readonly warnedProps = new Set<string>();
  protected readonly viewName: string;
  protected readonly animationsManager: ICSSAnimationsManager;
  protected readonly transitionsManager: ICSSTransitionsManager;

  protected constructor(
    viewName: string,
    animationsManager: ICSSAnimationsManager,
    transitionsManager: ICSSTransitionsManager
  ) {
    this.viewName = viewName;
    this.animationsManager = animationsManager;
    this.transitionsManager = transitionsManager;
  }

  protected filterAndValidateStyle<S extends AnyRecord>(
    style: CSSStyle<S>
  ): FilterResult {
    const filtered = filterCSSAndStyleProperties(style);

    if (__DEV__) {
      const filteredStyle = filtered[2];
      this.warnUnsupported(filteredStyle);
    }

    return filtered;
  }

  private warnUnsupported(style: AnyRecord) {
    if (!isReactComponentName(this.viewName)) {
      return;
    }

    for (const prop of Object.keys(style)) {
      if (
        UNSUPPORTED_TRANSFORM_PROPS_SET.has(prop) &&
        !this.warnedProps.has(prop)
      ) {
        this.warnedProps.add(prop);
        logger.warn(
          `The style property "${prop}" is not supported for ${this.viewName} CSS animations. Use the "transform" property instead.`
        );
      }
    }
  }

  unmountCleanup(): void {
    this.animationsManager.unmountCleanup();
    this.transitionsManager.unmountCleanup();
  }
}
