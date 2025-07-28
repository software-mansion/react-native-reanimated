'use strict';
import type { MaybeSharedValueRecursive, StyleProps } from '../commonTypes';
import type { CSSStyle } from '../css';
import type { AnyRecord } from '../css/types';
import type { AnimatedStyleHandle } from '../hook/useAnimatedStyle';
import type { AnimatedComponentStyle, NestedArray } from './commonTypes';

export function flattenArray<T>(array: NestedArray<T>): T[] {
  if (!Array.isArray(array)) {
    return [array];
  }
  const resultArr: T[] = [];

  const _flattenArray = (arr: NestedArray<T>[]): void => {
    arr.forEach((item) => {
      if (Array.isArray(item)) {
        _flattenArray(item);
      } else {
        resultArr.push(item);
      }
    });
  };
  _flattenArray(array);
  return resultArr;
}

export const has = <K extends string>(
  key: K,
  x: unknown
): x is { [key in K]: unknown } => {
  if (typeof x === 'function' || typeof x === 'object') {
    if (x === null || x === undefined) {
      return false;
    } else {
      return key in x;
    }
  }
  return false;
};

export function filterStyles(styles: AnimatedComponentStyle[] | undefined): {
  cssStyle: CSSStyle;
  animatedStyles: AnimatedStyleHandle[] | MaybeSharedValueRecursive<AnyRecord>;
} {
  if (!styles) {
    return { animatedStyles: [], cssStyle: {} };
  }

  return styles.reduce<{
    cssStyle: CSSStyle;
    animatedStyles: StyleProps[];
  }>(
    ({ animatedStyles, cssStyle }, style) => {
      if (style?.viewDescriptors) {
        animatedStyles.push(style);
      } else {
        cssStyle = { ...cssStyle, ...style } as CSSStyle;
      }
      return { animatedStyles, cssStyle };
    },
    { animatedStyles: [], cssStyle: {} }
  );
}
