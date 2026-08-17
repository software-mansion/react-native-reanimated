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

  const styleObject = style as UnknownRecord;
  const result: UnknownRecord = {};

  for (const key in styleObject) {
    if (isCSSConfigProp(key)) {
      continue;
    }
    const value = styleObject[key];
    if (isPseudoSelectorValue(value)) {
      const defaultValue = (value as { default?: unknown }).default;
      if (defaultValue !== undefined) {
        result[key] = defaultValue;
      }
      continue;
    }
    result[key] = value;
  }

  return result;
}

function omitCSSCallbackProps(props: UnknownRecord): UnknownRecord {
  const result: UnknownRecord = {};

  for (const key in props) {
    if (!isCSSCallbackProp(key)) {
      result[key] = props[key];
    }
  }

  return result;
}

/**
 * Everything the wrapped component should receive: the CSS config and the
 * lifecycle callbacks are ours to act on, so neither reaches the host view.
 */
export function filterCSSProps<P extends object>(props: P): P {
  const result = omitCSSCallbackProps(props as UnknownRecord);

  if ('style' in props) {
    result.style = filterStyleRecursive(props.style as StyleProp<CSSStyle>);
  }

  return result as P;
}
