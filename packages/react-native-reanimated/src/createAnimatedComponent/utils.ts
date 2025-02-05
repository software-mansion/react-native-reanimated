'use strict';
import type { PlainStyle, StyleProps } from '../commonTypes';
import type { NestedArray } from './commonTypes';

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

export function filterStyles(styles: StyleProps[] | undefined): {
  plainStyle: PlainStyle;
  animatedStyles: StyleProps[];
} {
  if (!styles) {
    return { animatedStyles: [], plainStyle: {} };
  }

  return styles.reduce<{
    plainStyle: PlainStyle;
    animatedStyles: StyleProps[];
  }>(
    ({ animatedStyles, plainStyle }, style) => {
      if (style?.viewDescriptors) {
        animatedStyles.push(style);
      } else {
        plainStyle = { ...plainStyle, ...style } as PlainStyle;
      }
      return { animatedStyles, plainStyle };
    },
    { animatedStyles: [], plainStyle: {} }
  );
}
