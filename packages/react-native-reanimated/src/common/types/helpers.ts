'use strict';

import type { ComponentType } from 'react';

export type Maybe<T> = T | null | undefined;

/**
 * Makes only mutable types (objects, arrays) readonly while leaving primitive
 * types unchanged. This prevents type issues caused by making other types
 * readonly, like Readonly<string> which isn't the same as string.
 */
export type NonMutable<T> = T extends object ? Readonly<T> : T;

export type UnknownRecord = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponent = ComponentType<any>;

export type Simplify<T> = {
  [K in keyof T]: T[K];
} & {};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[Keys];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConvertValueToArray<T> = Simplify<(T extends any[] ? T[number] : T)[]>;

export type ConvertValuesToArrays<T> = {
  [K in keyof T]-?: ConvertValueToArray<Exclude<T[K], undefined>>;
};

export type ConvertValuesToArraysWithUndefined<T> = {
  [K in keyof T]-?: ConvertValueToArray<T[K]>;
};
