'use strict';
import type { StyleProp } from 'react-native';

import type { UnknownRecord } from '../../common';
import type { CSSStyle } from '../types';
import {
  CSS_CALLBACK_PROPS,
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

function omitCSSCallbackProps(props: object): UnknownRecord {
  const result: UnknownRecord = {};

  for (const [key, value] of Object.entries(props)) {
    if (!isCSSCallbackProp(key)) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Everything the wrapped component should receive: the CSS config and the
 * lifecycle callbacks are ours to act on, so neither reaches the host view.
 */
export function filterCSSProps<P extends object>(props: P): P {
  // A view with no callbacks has nothing to drop, so it is copied in one go
  // instead of being rebuilt key by key on every render.
  const result = CSS_CALLBACK_PROPS.some((prop) => prop in props)
    ? omitCSSCallbackProps(props)
    : ({ ...props } as UnknownRecord);

  if ('style' in props) {
    result.style = filterStyleRecursive(props.style as StyleProp<CSSStyle>);
  }

  return result as P;
}
