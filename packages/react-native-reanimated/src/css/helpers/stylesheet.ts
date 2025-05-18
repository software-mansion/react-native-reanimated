'use strict';

import { logger } from 'react-native-worklets';

import type { CSSStyle } from '../types';
import { isCSSKeyframesRule } from '../utils';

type NamedStyles<T> = { [P in keyof T]: CSSStyle };

function checkAnimationName(
  animationName: Required<CSSStyle['animationName']>
) {
  if (typeof animationName !== 'object') {
    return;
  }

  const keyframesArray = Array.isArray(animationName)
    ? animationName
    : [animationName];

  keyframesArray.forEach((keyframes) => {
    if (!isCSSKeyframesRule(keyframes)) {
      logger.warn(
        `You are using inline CSS animation keyframes in the stylesheet object:\n${JSON.stringify(keyframes, null, 2)}\n\nConsider using the css.keyframes helper function for performance optimization.`
      );
    }
  });
}

export const create = <T extends NamedStyles<T>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: T & NamedStyles<any>
): T => {
  // TODO - implement more optimizations and correctness checks in dev here
  if (__DEV__) {
    for (const key in styles) {
      if (styles[key]) {
        const style = styles[key];
        if (style.animationName) {
          checkAnimationName(style.animationName);
        }
        Object.freeze(style);
      }
    }
  }

  return styles;
};
