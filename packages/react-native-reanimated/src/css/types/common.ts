'use strict';
import type {
  ImageStyle,
  TextStyle,
  TransformsStyle,
  ViewStyle,
} from 'react-native';

export type CSSStyleProps = ViewStyle & TextStyle & ImageStyle;

export type CSSTimeUnit = `${number}s` | `${number}ms` | number;

export type TransformsArray = Exclude<
  TransformsStyle['transform'],
  string | undefined
>;

export type TransformOrigin = string | Array<string | number>;

// AFTER NORMALIZATION

export type NormalizedTransformOrigin = [
  `${number}%` | number,
  `${number}%` | number,
  number,
];
