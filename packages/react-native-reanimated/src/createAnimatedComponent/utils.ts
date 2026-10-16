'use strict';
import type { StyleProps } from '../commonTypes';
import type { CSSStyle } from '../css';
import { isPseudoSelectorValue } from '../css/utils';
import { isSharedValue } from '../isSharedValue';
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

type FilteredStyles = {
  cssStyle: CSSStyle | null;
  animatedStyles: StyleProps[];
};

function withInheritedDefault(value: unknown, overridden: unknown): unknown {
  if (!isPseudoSelectorValue(value) || value.default !== undefined) {
    return value;
  }
  const restingValue = isPseudoSelectorValue(overridden)
    ? overridden.default
    : overridden;
  if (restingValue === undefined || isSharedValue(restingValue)) {
    return value;
  }
  return { ...value, default: restingValue };
}

export function filterStyles(
  styles: StyleProps[] | undefined,
  inheritedValues: Record<string, unknown> = {}
): FilteredStyles {
  const animatedStyles: StyleProps[] = [];
  if (!styles) {
    return { animatedStyles, cssStyle: null };
  }

  const restingValues = { ...inheritedValues };
  let cssStyle: Record<string, unknown> | null = null;
  for (const style of styles) {
    if (style?.viewDescriptors) {
      animatedStyles.push(style);
      for (const key in style.initial?.value) {
        delete restingValues[key];
      }
    } else {
      cssStyle ??= {};
      for (const key of Object.keys(style ?? {})) {
        const value = withInheritedDefault(style[key], restingValues[key]);
        cssStyle[key] = value;
        restingValues[key] = value;
      }
    }
  }
  return { animatedStyles, cssStyle: cssStyle as CSSStyle | null };
}
