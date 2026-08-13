'use strict';
import type { StyleProp } from 'react-native';

import type { UnknownRecord } from '../../common';
import type { CSSStyle } from '../types';
import {
  isCSSCallbackProp,
  isCSSConfigProp,
  isPseudoSelectorValue,
} from '../utils/guards';

function filterStyleRecursive(style: StyleProp<CSSStyle>): StyleProp<CSSStyle> {
  if (Array.isArray(style)) {
    return style.map((entry) =>
      filterStyleRecursive(entry as StyleProp<CSSStyle>)
    );
  }

  if (!style || typeof style !== 'object') {
    return style;
  }

  return Object.entries(style).reduce<UnknownRecord>((acc, [key, value]) => {
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

/**
 * Everything the wrapped component should receive: the CSS config and the
 * lifecycle callbacks are ours to act on, so neither reaches the host view.
 */
export function filterCSSProps<P extends { style?: unknown }>(props: P): P {
  const result: UnknownRecord = {};

  for (const [key, value] of Object.entries(props)) {
    if (!isCSSCallbackProp(key)) {
      result[key] = value;
    }
  }

  if ('style' in props) {
    result.style = filterStyleRecursive(props.style as StyleProp<CSSStyle>);
  }

  return result as P;
}
