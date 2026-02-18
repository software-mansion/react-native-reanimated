'use strict';
import { CSSKeyframesRuleImpl } from '../platform';
import type { CSSStyle } from '../types';
import { isCSSKeyframesRule } from '../utils';

type NamedStyles<T> = { [P in keyof T]: CSSStyle };

function parseAnimationName(
  animationName: Required<CSSStyle['animationName']>
) {
  if (typeof animationName !== 'object') {
    return;
  }

  const keyframesArray = Array.isArray(animationName)
    ? animationName
    : [animationName];

  return keyframesArray.map((keyframes) =>
    isCSSKeyframesRule(keyframes)
      ? keyframes
      : new CSSKeyframesRuleImpl(keyframes)
  );
}

export const create = <T extends NamedStyles<T>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: T & NamedStyles<any>
): T => {
  // TODO - implement more optimizations and correctness checks in dev here

  for (const key in styles) {
    const style = styles[key];
    if (style.animationName) {
      style.animationName = parseAnimationName(style.animationName);
    }
  }

  if (__DEV__) {
    for (const key in styles) {
      Object.freeze(styles[key]);
    }
  }

  return styles;
};
