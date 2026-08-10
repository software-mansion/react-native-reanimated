'use strict';

import type { TransformsStyle } from 'react-native';

export type TransformOrigin = string | Array<string | number>;

export type NormalizedTransformOrigin = [
  `${number}%` | number,
  `${number}%` | number,
  number,
];

export type TransformsArray = Exclude<
  TransformsStyle['transform'],
  string | undefined
>;

export type ParsedDropShadow = {
  offsetX: number;
  offsetY: number;
  standardDeviation: number;
  color: number | null;
};

export type ParsedFilterFunction =
  | { brightness?: number }
  | { contrast?: number }
  | { dropShadow?: ParsedDropShadow }
  | { grayscale?: number }
  | { hueRotate?: number }
  | { invert?: number }
  | { opacity?: number }
  | { saturate?: number }
  | { sepia?: number }
  | { blur?: number };

export type FilterArray = ParsedFilterFunction[];
