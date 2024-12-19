'use strict';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyRecord = Record<string, any>;

export type Maybe<T> = T | null | undefined;

export type NoUndef<T> = T extends undefined ? never : T;

export type Repeat<
  T,
  N extends number,
  R extends T[] = [],
> = R['length'] extends N ? R : Repeat<T, N, [...R, T]>;

export type ConvertValuesToArrays<T> = {
  [K in keyof T]: T[K] extends infer U
    ? U extends undefined
      ? never
      : U extends any[]
        ? U
        : U[]
    : never;
};

export type AddArrayPropertyTypes<T> = {
  [P in keyof T]: T[P] extends undefined ? undefined : T[P] | NoUndef<T[P]>[];
};
