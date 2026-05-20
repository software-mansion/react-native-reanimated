'use strict';

import type {
  ImageStyle,
  TextStyle,
  TransformsStyle,
  ViewStyle,
} from 'react-native';

export type TransformOrigin = string | Array<string | number>;

export type NormalizedTransformOrigin = [
  `${number}%` | number,
  `${number}%` | number,
  number,
];

type DeprecatedProps =
  | 'transformMatrix'
  | 'rotation'
  | 'scaleX'
  | 'scaleY'
  | 'translateX'
  | 'translateY';

export type PlainStyle = Omit<
  ViewStyle & TextStyle & ImageStyle,
  DeprecatedProps
>;

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
  | { brightness?: number | undefined }
  | { contrast?: number | undefined }
  | { dropShadow?: ParsedDropShadow | undefined }
  | { grayscale?: number | undefined }
  | { hueRotate?: number | undefined }
  | { invert?: number | undefined }
  | { opacity?: number | undefined }
  | { saturate?: number | undefined }
  | { sepia?: number | undefined }
  | { blur?: number | undefined };

export type FilterArray = ParsedFilterFunction[];
