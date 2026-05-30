'use strict';

// CSS `vector-effect` uses kebab-case keywords; map the react-native-svg prop
// values onto them (the native side maps the same values onto integer enums).
const VECTOR_EFFECT_CSS_VALUES: Record<string, string> = {
  none: 'none',
  default: 'none',
  nonScalingStroke: 'non-scaling-stroke',
  'non-scaling-stroke': 'non-scaling-stroke',
  inherit: 'inherit',
};

export const processVectorEffect = (value: string): string =>
  VECTOR_EFFECT_CSS_VALUES[value] ?? value;
