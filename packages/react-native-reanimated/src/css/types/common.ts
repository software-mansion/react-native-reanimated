import type { TransformsStyle } from 'react-native';

export type CSSTimeUnit = `${number}s` | `${number}ms` | number;

export type TransformsArray = Exclude<
  TransformsStyle['transform'],
  string | undefined
>;

export type TransformOrigin = string | Array<string | number>;

// AFTER NORMALIZATION

export type NormalizedTransformOrigin = [
  string | number,
  string | number,
  number,
];
