'use strict';
import type { StyleProp } from 'react-native';

import type { AnyRecord, CSSStyle } from '../types';
import { isCSSStyleProp } from '../utils/guards';

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
        acc[key] = value;
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
