'use strict';

export function parseCSSAnimationShorthand(value: string) {
  const parts = value.split(',');
  return parts.map((part) => part.trim());
}
