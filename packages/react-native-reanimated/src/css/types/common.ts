'use strict';
import type { ComponentType } from 'react';
import type {
  ImageStyle,
  TextStyle,
  TransformsStyle,
  ViewStyle,
} from 'react-native';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponent = ComponentType<any>;

export type TimeUnit = `${number}s` | `${number}ms` | number;

export type Percentage = `${number}%`;

export type Point = { x: number; y: number };

export type TransformsArray = Exclude<
  TransformsStyle['transform'],
  string | undefined
>;
