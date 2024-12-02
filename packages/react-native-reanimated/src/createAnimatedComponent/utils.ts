'use strict';
import type { StyleProps } from '../commonTypes';
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
  plainStyles: StyleProps[];
  animatedStyles: StyleProps[];
} {
  if (!styles) {
    return { animatedStyles: [], plainStyles: [] };
  }

  return styles.reduce<{
    plainStyles: StyleProps[];
    animatedStyles: StyleProps[];
  }>(
    ({ animatedStyles, plainStyles }, style) => {
      if (style?.viewDescriptors) {
        animatedStyles.push(style);
      } else {
        plainStyles.push(style);
      }
      return { animatedStyles, plainStyles };
    },
    { animatedStyles: [], plainStyles: [] }
  );
}
