'use strict';
import {
  isReactComponentName,
  logger,
  UNSUPPORTED_TRANSFORM_PROPS,
} from '../../common';
import type { CSSStyle } from '../types';

const UNSUPPORTED_TRANSFORM_PROPS_SET = new Set<string>(
  UNSUPPORTED_TRANSFORM_PROPS
);

export default abstract class BaseCSSManager {
  private readonly warnedProps = new Set<string>();

  protected warnOnUnsupportedProps(style: CSSStyle, componentName: string) {
    if (!isReactComponentName(componentName)) {
      return;
    }

    Object.keys(style).forEach((prop) => {
      if (
        UNSUPPORTED_TRANSFORM_PROPS_SET.has(prop) &&
        !this.warnedProps.has(prop)
      ) {
        this.warnedProps.add(prop);
        logger.warn(
          `The style property "${prop}" is not supported for ${componentName} CSS animations. Use the "transform" property instead.`
        );
      }
    });
  }
}
