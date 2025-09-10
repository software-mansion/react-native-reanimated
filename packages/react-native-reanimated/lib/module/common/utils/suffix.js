'use strict';

export function hasSuffix(value) {
  return typeof value === 'string' && isNaN(parseInt(value[value.length - 1]));
}
export function maybeAddSuffix(value, suffix) {
  return hasSuffix(value) ? value : `${String(value)}${suffix}`;
}
//# sourceMappingURL=suffix.js.map