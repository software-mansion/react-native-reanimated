'use strict';
'worklet';

import { isLength } from "../utils/guards.js";
const LENGTH_MAPPINGS = ['offsetX', 'offsetY', 'blurRadius', 'spreadDistance'];
const SHADOW_PARTS_REGEX = /(?:[^\s()]+|\([^()]*\))+/g;
const SHADOW_SPLIT_REGEX = /(?:[^,()]+|\([^)]*\))+(?=\s*,|$)/g;
export function parseBoxShadowString(value) {
  if (value === 'none') {
    return [];
  }
  const shadows = value.match(SHADOW_SPLIT_REGEX) || [];
  return shadows.map(shadow => {
    const result = {
      offsetX: 0,
      offsetY: 0
    };
    let foundLengthsCount = 0;
    const parts = shadow.match(SHADOW_PARTS_REGEX) || [];
    parts.forEach(part => {
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
//# sourceMappingURL=parsers.js.map