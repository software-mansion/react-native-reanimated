'use strict';
import type { ComponentType } from 'react';
import type {
  ImageStyle,
  TextStyle,
  TransformsStyle,
  ViewStyle,
} from 'react-native';

export type PlainStyleProps = ViewStyle & TextStyle & ImageStyle;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponent = ComponentType<any>;

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
