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

/**
 * A pseudo object without `default` rests at whatever the host view renders for
 * that property, which is the value it overrides: a plain value or the
 * `default` of another pseudo object. Filling it in here keeps the CSS manager
 * in sync with the host view, so leaving a matched selector transitions back to
 * that value instead of the property's built-in default.
 */
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

function mergeCSSStyle(
  base: Record<string, unknown> | null,
  overrides: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  if (overrides) {
    for (const key of Object.keys(overrides)) {
      result[key] = withInheritedDefault(overrides[key], result[key]);
    }
  }
  return result;
}

export function filterStyles(styles: StyleProps[] | undefined): FilteredStyles {
  if (!styles) {
    return { animatedStyles: [], cssStyle: null };
  }

  return styles.reduce<FilteredStyles>(
    ({ animatedStyles, cssStyle }, style) => {
      if (style?.viewDescriptors) {
        animatedStyles.push(style);
      } else {
        cssStyle = mergeCSSStyle(cssStyle, style) as CSSStyle;
      }
      return { animatedStyles, cssStyle };
    },
    { animatedStyles: [], cssStyle: null }
  );
}

/**
 * Builds the CSS style of a component whose CSS properties live in
 * `animatedProps` (SVG elements are styled through top level props, not
 * `style`), so every remaining prop counts as a style property too.
 */
export function mergeCSSAnimatedProps(
  props: Record<string, unknown>,
  cssAnimatedProps: Record<string, unknown>
): CSSStyle {
  const mergedProps = mergeCSSStyle(props, cssAnimatedProps);
  delete mergedProps.style;
  delete mergedProps.animatedProps;
  return mergedProps as CSSStyle;
}
