'use strict';
export type Maybe<T> = T | null | undefined;

/**
 * Makes only mutable types (objects, arrays) readonly while leaving primitive
 * types unchanged. This prevents type issues caused by making other types
 * readonly, like Readonly<string> which isn't the same as string.
 */
export type NonMutable<T> = T extends object ? Readonly<T> : T;

export type ValueProcessor<V, R = V> = (
  value: NonMutable<V>
) => Maybe<R> | Record<string, R>;

export type TransformOrigin = string | Array<string | number>;

export type NormalizedTransformOrigin = [
  `${number}%` | number,
  `${number}%` | number,
  number,
];
