'use strict';
import type { CSSStyle } from '../types';
import { logger } from '../../common';

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

export default abstract class BaseCSSManager {
  private readonly warnedProps = new Set<string>();

  protected warnOnUnsupportedProps(style: CSSStyle, componentName: string) {
    if (!style) {
      return;
    }

    Object.keys(style).forEach((prop) => {
      if (
        UNSUPPORTED_TRANSFORM_PROPS.has(prop) &&
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
