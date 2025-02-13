import type { StyleProp } from 'react-native';
import { StyleSheet } from 'react-native';

import type { AnyRecord, CSSStyle, PlainStyle } from '../types';
import { isCSSStyleProp } from '../utils/guards';

export function filterNonCSSStyleProps(props: StyleProp<CSSStyle>): PlainStyle {
  const flattened = StyleSheet.flatten(props);
  return Object.entries(flattened).reduce<AnyRecord>((acc, [key, value]) => {
    if (!isCSSStyleProp(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});
}
