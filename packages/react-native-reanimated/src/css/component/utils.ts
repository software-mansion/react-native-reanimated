'use strict';
import type { StyleProp } from 'react-native';

import type { AnyRecord } from '../../common';
import type { CSSStyle } from '../types';
import { isCSSStyleProp, isPseudoSelectorValue } from '../utils/guards';

function filterNonCSSStylePropsRecursive(
  props: StyleProp<CSSStyle>
): StyleProp<CSSStyle> {
  if (Array.isArray(props)) {
    return props.map((prop) =>
      filterNonCSSStylePropsRecursive(prop as StyleProp<CSSStyle>)
    );
  }

  if (!props) {
    return props;
  }

  if (typeof props === 'object') {
    return Object.entries(props).reduce<AnyRecord>((acc, [key, value]) => {
      if (!isCSSStyleProp(key)) {
        if (isPseudoSelectorValue(value)) {
          const defaultValue = (value as Record<string, unknown>).default;
          if (defaultValue !== undefined) {
            acc[key] = defaultValue;
          }
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, {});
  }

  return props;
}

export function filterNonCSSStyleProps(
  props: StyleProp<CSSStyle>
): StyleProp<CSSStyle> {
  return filterNonCSSStylePropsRecursive(props);
}
