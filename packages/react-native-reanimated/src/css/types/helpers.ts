'use strict';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyRecord = Record<string, any>;

type NoUndef<T> = T extends undefined ? never : T;

export type Repeat<
  T,
  N extends number,
  R extends T[] = [],
> = R['length'] extends N ? R : Repeat<T, N, [...R, T]>;

type Simplify<T> = {
  [K in keyof T]: T[K];
} & {};

type ConvertValueToArray<T> = Simplify<(T extends any[] ? T[number] : T)[]>;

export type ConvertValuesToArrays<T> = {
  [K in keyof T]-?: ConvertValueToArray<Exclude<T[K], undefined>>;
};

export type ConvertValuesToArraysWithUndefined<T> = {
  [K in keyof T]-?: ConvertValueToArray<T[K]>;
};

export type AddArrayPropertyType<T> = T | T[];

export type AddArrayPropertyTypes<T> = {
  [P in keyof T]: T[P] extends undefined ? undefined : T[P] | NoUndef<T[P]>[];
};
