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
