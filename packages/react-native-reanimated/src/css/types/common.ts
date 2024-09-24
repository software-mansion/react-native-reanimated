import type { TransformsStyle } from 'react-native';

export type CSSTimeUnit = `${number}s` | `${number}ms` | number;

export type TransformsArray = Exclude<
  TransformsStyle['transform'],
  string | undefined
>;
