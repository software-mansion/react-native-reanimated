'use strict';
import type { BoxShadowValue } from 'react-native';

import { isLength } from '../utils/guards';

const LENGTH_MAPPINGS = [
  'offsetX',
  'offsetY',
  'blurRadius',
  'spreadDistance',
] as const;

export const CSS_NUMBER_PATTERN = String.raw`[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?`;
const ANGLE_UNIT_REGEX = new RegExp(
  `^(${CSS_NUMBER_PATTERN})(deg|grad|rad|turn)$`,
  'i'
);

const SHADOW_PARTS_REGEX = /(?:[^\s()]+|\([^()]*\))+/g;
const SHADOW_SPLIT_REGEX = /(?:[^,()]+|\([^)]*\))+(?=\s*,|$)/g;

export function parseBoxShadowString(value: string) {
  'worklet';
  if (value === 'none') {
    return [];
  }

  const shadows = value.match(SHADOW_SPLIT_REGEX) || [];

  return shadows.map<BoxShadowValue>((shadow) => {
    const result: BoxShadowValue = {
      offsetX: 0,
      offsetY: 0,
    };

    let foundLengthsCount = 0;
    const parts = shadow.match(SHADOW_PARTS_REGEX) || [];

    parts.forEach((part) => {
      if (isLength(part)) {
        result[LENGTH_MAPPINGS[foundLengthsCount++]] = part;
      } else if (part === 'inset') {
        result.inset = true;
      } else {
        result.color = part.trim();
      }
    });

    return result;
  });
}

export function splitByComma(str: string) {
  'worklet';
  // split by comma not enclosed in parentheses
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  for (const char of str) {
    if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
    } else if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current.trim());
  return parts;
}

export function splitByWhitespace(str: string) {
  'worklet';
  // split by whitespace not enclosed in parentheses
  return str.split(/\s+(?![^()]*\))/);
}

export function getAngleInDegrees(angle: string): number | null {
  'worklet';
  const match = angle.match(ANGLE_UNIT_REGEX);
  if (!match) {
    return null;
  }
  const numericValue = parseFloat(match[1]);
  switch (match[2].toLowerCase()) {
    case 'deg':
      return numericValue;
    case 'grad':
      return numericValue * 0.9;
    case 'rad':
      return (numericValue * 180) / Math.PI;
    case 'turn':
      return numericValue * 360;
    default:
      return null;
  }
}
