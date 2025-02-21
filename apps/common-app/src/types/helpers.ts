/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ViewStyle } from 'react-native';

export type AnyRecord = Record<string, any>;

export type AnyFunction = (...args: Array<any>) => any;

export type Transforms = ViewStyle['transform'];

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type NoUndef<T> = T extends undefined ? never : T;

export type UnpackArray<T> = T extends Array<infer U> ? U : T;
