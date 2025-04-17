import type { BoxShadowValue } from 'react-native';

// GUARDS
const isLength = (value: string) => {
  'worklet';
  return value.endsWith('px') || !isNaN(Number(value));
};

// PARSERS
const LENGTH_MAPPINGS = [
  'offsetX',
  'offsetY',
  'blurRadius',
  'spreadDistance',
] as const;

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
