'use strict';
import type {
  Falsy,
  RecursiveArray,
  RegisteredStyle,
  StyleProp,
} from 'react-native';

import type { AnyRecord, CSSStyle } from '../types';
import { isCSSStyleProp } from '../utils/guards';

type BaseStyle = CSSStyle | Falsy | RegisteredStyle<CSSStyle>;
type StyleProps = BaseStyle | RecursiveArray<BaseStyle> | readonly BaseStyle[];

function filterNonCSSStylePropsRecursive(
  props: StyleProps
): StyleProp<CSSStyle> {
  if (Array.isArray(props)) {
    return props.map(filterNonCSSStylePropsRecursive);
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
