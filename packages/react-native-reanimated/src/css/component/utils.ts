'use strict';
import type { StyleProp } from 'react-native';

import type { UnknownRecord } from '../../common';
import type { CSSStyle } from '../types';
import { isCSSConfigProp, isPseudoSelectorValue } from '../utils/guards';

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
    return Object.entries(props).reduce<UnknownRecord>((acc, [key, value]) => {
      if (isCSSConfigProp(key)) {
        return acc;
      }
      if (isPseudoSelectorValue(value)) {
        const defaultValue = (value as { default?: unknown }).default;
        if (defaultValue !== undefined) {
          acc[key] = defaultValue;
        }
        return acc;
      }
      acc[key] = value;
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
