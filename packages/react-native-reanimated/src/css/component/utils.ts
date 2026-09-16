'use strict';
import type { StyleProp } from 'react-native';

import type { UnknownRecord } from '../../common';
import { flattenArray } from '../../createAnimatedComponent/utils';
import type { CSSStyle } from '../types';
import {
  isCSSCallbackProp,
  isCSSConfigProp,
  isPseudoSelectorValue,
} from '../utils/guards';

function isStyleObject(entry: unknown): entry is UnknownRecord {
  return !!entry && typeof entry === 'object';
}

/**
 * A pseudo object owns its property: the host view renders only its `default`
 * and a value set for that property by an earlier entry of the style array is
 * dropped, so without `default` the property rests at its own default value.
 * The property is removed from those entries rather than set to `undefined` in
 * the pseudo object's entry, because react-native-web skips `undefined` values
 * when it merges style entries.
 */
function filterStyle(style: StyleProp<CSSStyle>): StyleProp<CSSStyle> {
  const entries = flattenArray(style as unknown[]).filter(isStyleObject);
  const lastSetter = new Map<string, number>();
  entries.forEach((entry, index) => {
    for (const key in entry) {
      lastSetter.set(key, index);
    }
  });

  const filtered = entries.map((entry, index) => {
    const result: UnknownRecord = {};
    for (const key in entry) {
      if (isCSSConfigProp(key)) {
        continue;
      }
      const owner = lastSetter.get(key) ?? index;
      if (owner !== index && isPseudoSelectorValue(entries[owner][key])) {
        continue;
      }
      const value = entry[key];
      if (isPseudoSelectorValue(value)) {
        if (value.default !== undefined) {
          result[key] = value.default;
        }
        continue;
      }
      result[key] = value;
    }
    return result;
  });

  return (
    Array.isArray(style) ? filtered : (filtered[0] ?? style)
  ) as StyleProp<CSSStyle>;
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
    result.style = filterStyle(props.style as StyleProp<CSSStyle>);
  }

  return result as P;
}
