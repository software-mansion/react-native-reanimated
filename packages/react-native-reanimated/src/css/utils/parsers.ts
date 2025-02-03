'use strict';
import type { BoxShadowValue } from 'react-native';

import { isLength } from './guards';

const LENGTH_MAPPINGS = [
  'offsetX',
  'offsetY',
  'blurRadius',
  'spreadDistance',
] as const;

export function parseBoxShadowString(value: string) {
  if (value === 'none') {
    return [];
  }

  return value.split(/\s*,\s*/).map<BoxShadowValue>((shadow) => {
    const result: BoxShadowValue = {
      offsetX: 0,
      offsetY: 0,
    };

    let foundLengthsCount = 0;
    shadow.split(/\s+/).forEach((part) => {
      if (isLength(part)) {
        result[LENGTH_MAPPINGS[foundLengthsCount++]] = part;
      } else if (part === 'inset') {
        result.inset = true;
      } else {
        result.color = part;
      }
    });

    return result;
  });
}
