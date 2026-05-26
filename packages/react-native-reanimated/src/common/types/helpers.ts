'use strict';

import type { ComponentType } from 'react';

export type Maybe<T> = T | null | undefined;

/**
 * Makes only mutable types (objects, arrays) readonly while leaving primitive
 * types unchanged. This prevents type issues caused by making other types
 * readonly, like Readonly<string> which isn't the same as string.
 */
export type NonMutable<T> = T extends object ? Readonly<T> : T;

// `Record<string, any>` here is load-bearing: consumers like `PropsBuilderConfig`
// constrain on `P extends AnyRecord` and rely on property access widening to
// `any` so per-key processors can return arbitrary CPP-side values.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRecord = Record<string, any>;
export type UnknownRecord = Record<string, unknown>;

// React's `ComponentType<P>` expects `P` to be a props record; `unknown` would
// force every consumer to narrow before reading individual prop fields.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponent = ComponentType<any>;

type Simplify<T> = {
  [K in keyof T]: T[K];
} & {};

type ConvertValueToArray<T> = Simplify<(T extends unknown[] ? T[number] : T)[]>;

export type ConvertValuesToArrays<T> = {
  [K in keyof T]-?: ConvertValueToArray<Exclude<T[K], undefined>>;
};

export type ConvertValuesToArraysWithUndefined<T> = {
  [K in keyof T]-?: ConvertValueToArray<T[K]>;
};
