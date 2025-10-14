'use strict';
import type { TransformsStyle } from 'react-native';

export type TimeUnit = `${number}s` | `${number}ms` | number;

export type Percentage = `${number}%`;

export type Point = { x: number; y: number };

export type TransformsArray = Exclude<
  TransformsStyle['transform'],
  string | undefined
>;
