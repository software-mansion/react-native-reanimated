import type { ViewStyle } from 'react-native';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyRecord = Record<string, any>;

export type AnyFunction = (...args: Array<any>) => any;

export type Transforms = ViewStyle['transform'];

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
