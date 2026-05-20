'use strict';

import type { PseudoSelectorKey } from './props';

type NoUndef<T> = T extends undefined ? never : T;

export type Repeat<
  T,
  N extends number,
  R extends T[] = [],
> = R['length'] extends N ? R : Repeat<T, N, [...R, T]>;

export type AddArrayPropertyType<T> = T | T[];

export type AddArrayPropertyTypes<T> = {
  [P in keyof T]: T[P] extends undefined ? undefined : T[P] | NoUndef<T[P]>[];
};

type PseudoKeyedTransitionValue<T> = { default?: T | T[] } & {
  [K in PseudoSelectorKey]?: T | T[];
} & { [K in `:${string}`]?: T | T[] };

export type AddArrayAndPseudoKeyedTypes<T> = {
  [P in keyof T]: T[P] extends undefined
    ? undefined
    : T[P] | NoUndef<T[P]>[] | PseudoKeyedTransitionValue<NoUndef<T[P]>>;
};

type StripPseudoKeyed<T> =
  T extends PseudoKeyedTransitionValue<infer U> ? U | U[] : T;
export type StripPseudoKeyedTypes<T> = {
  [P in keyof T]: StripPseudoKeyed<T[P]>;
};
