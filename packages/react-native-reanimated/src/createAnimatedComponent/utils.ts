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

type FilterStylesOptions = {
  animated?: boolean;
  plain?: boolean;
};

export function filterStyles<O extends { plain: true; animated: true }>(
  styles: StyleProps[],
  options?: O
): { plainStyles: StyleProps[]; animatedStyles: StyleProps[] };

export function filterStyles<O extends { plain: true }>(
  styles: StyleProps[],
  options?: O
): { plainStyles: StyleProps[] };

export function filterStyles<O extends { animated: true }>(
  styles: StyleProps[],
  options?: O
): { animatedStyles: StyleProps[] };

export function filterStyles(
  styles: StyleProps[] | undefined,
  options: FilterStylesOptions = { animated: true, plain: true }
): {
  animatedStyles?: StyleProps[];
  plainStyles?: StyleProps[];
} {
  if (!styles) {
    return { animatedStyles: [], plainStyles: [] };
  }

  if (options.animated && options.plain) {
    return styles.reduce(
      ({ animatedStyles, plainStyles }, style) => {
        if (style?.viewDescriptors) {
          animatedStyles.push(style);
        } else {
          plainStyles.push(style);
        }
        return { animatedStyles, plainStyles };
      },
      { animatedStyles: [], plainStyles: [] }
    ) as { animatedStyles: StyleProps[]; plainStyles: StyleProps[] };
  }

  if (options.animated) {
    return {
      animatedStyles: styles.filter((style) => style?.viewDescriptors),
    };
  }

  return {
    plainStyles: styles.filter((style) => !style?.viewDescriptors),
  };
}
