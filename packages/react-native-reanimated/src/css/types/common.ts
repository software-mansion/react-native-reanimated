'use strict';
import type { ComponentType } from 'react';
import type { TransformsStyle } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponent = ComponentType<any>;

export type TimeUnit = `${number}s` | `${number}ms` | number;

export type Percentage = `${number}%`;

export type Point = { x: number; y: number };

export type TransformsArray = Exclude<
  TransformsStyle['transform'],
  string | undefined
>;
