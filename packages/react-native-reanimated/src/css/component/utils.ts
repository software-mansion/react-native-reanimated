'use strict';
import type { StyleProp } from 'react-native';

import type { UnknownRecord } from '../../common';
import type { CSSStyle } from '../types';
import {
  isCSSCallbackProp,
  isCSSConfigProp,
  isPseudoSelectorValue,
} from '../utils/guards';

type PseudoOwners = Map<string, UnknownRecord>;

/**
 * A pseudo object owns its property: the host view renders only its `default`
 * and a value set for that property by an earlier entry of the style array is
 * dropped, so without `default` the property rests at its own default value.
 * Returns the owning pseudo object per property, or null when the style has
 * none, which is the common case and skips the ownership check entirely.
 */
function collectPseudoOwners(
  style: StyleProp<CSSStyle>,
  owners: PseudoOwners | null = null
): PseudoOwners | null {
  if (Array.isArray(style)) {
    for (let i = 0; i < style.length; i++) {
      owners = collectPseudoOwners(style[i] as StyleProp<CSSStyle>, owners);
    }
    return owners;
  }

  if (!style || typeof style !== 'object') {
    return owners;
  }

  const styleObject = style as UnknownRecord;
  for (const key in styleObject) {
    if (isPseudoSelectorValue(styleObject[key])) {
      (owners ??= new Map()).set(key, styleObject);
    } else {
      // A later plain value replaces the pseudo object again.
      owners?.delete(key);
    }
  }

  return owners;
}

function filterStyleRecursive(
  style: StyleProp<CSSStyle>,
  owners: PseudoOwners | null
): StyleProp<CSSStyle> {
  if (Array.isArray(style)) {
    return style.map((entry) =>
      filterStyleRecursive(entry as StyleProp<CSSStyle>, owners)
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
    const owner = owners?.get(key);
    if (owner !== undefined && owner !== styleObject) {
      continue;
    }
    const value = styleObject[key];
    if (isPseudoSelectorValue(value)) {
      if (value.default !== undefined) {
        result[key] = value.default;
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
    const style = props.style as StyleProp<CSSStyle>;
    result.style = filterStyleRecursive(style, collectPseudoOwners(style));
  }

  return result as P;
}
