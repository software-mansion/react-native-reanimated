'use strict';
import { ReanimatedError } from '../../../errors';
import type { StyleProps } from '../../../commonTypes';
import { isColorProp, isTransformString } from '../../utils';
import { normalizeTransformString } from './transformString';
import { normalizeCSSAnimationColor } from '../../../Colors';
import { normalizeTransformOrigin } from './transformOrigin';

export const ERROR_MESSAGES = {
  invalidColor: (color: string) => `Invalid color value: ${color}`,
};

type PropertyName = keyof StyleProps;

export function normalizeStyle(style: StyleProps): StyleProps {
  const entries: [PropertyName, StyleProps[PropertyName]][] = [];

  for (const [key, value] of Object.entries(style)) {
    let propValue = value;

    if (value === 'auto') {
      propValue = undefined;
    }

    if (isColorProp(key, propValue)) {
      const normalizedColor = normalizeCSSAnimationColor(propValue);
      if (!normalizedColor && normalizedColor !== 0) {
        throw new ReanimatedError(ERROR_MESSAGES.invalidColor(propValue));
      }
      entries.push([key, normalizedColor]);
      continue;
    }

    if (isTransformString(key, propValue)) {
      entries.push([key, normalizeTransformString(propValue)]);
      continue;
    }

    switch (key) {
      case 'transformOrigin':
        entries.push([key, normalizeTransformOrigin(propValue)]);
        break;
      case 'gap':
        entries.push(['rowGap', propValue], ['columnGap', propValue]);
        break;
      default:
        entries.push([key, propValue]);
    }
  }

  return Object.fromEntries(entries);
}
