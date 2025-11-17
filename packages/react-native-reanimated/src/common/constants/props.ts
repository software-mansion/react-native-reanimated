'use strict';

export const UNSUPPORTED_TRANSFORM_PROPS = [
  'transformMatrix',
  'rotation',
  'scaleX',
  'scaleY',
  'translateX',
  'translateY',
] as const;

export type UnsupportedTransformProp =
  (typeof UNSUPPORTED_TRANSFORM_PROPS)[number];
