'use strict';

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

// Pseudo-keyed override shape for transition* fields, matching the
// pseudo-style value cascade: { default, ':hover', ':active', ... }. Each
// entry can be a scalar OR an array (per-property timing aligned with
// transitionProperty).
type PseudoKeyedTransitionValue<T> = {
  default?: T | T[];
  ':hover'?: T | T[];
  ':active'?: T | T[];
  ':active-deepest'?: T | T[];
  ':focus'?: T | T[];
  ':focus-within'?: T | T[];
};

export type AddPseudoKeyedTypes<T> = {
  [P in keyof T]: T[P] extends undefined
    ? undefined
    : T[P] | NoUndef<T[P]>[] | PseudoKeyedTransitionValue<NoUndef<T[P]>>;
};

// Reverse of AddPseudoKeyedTypes: at the internal expanded-type layer, the
// pseudo-keyed branch has already been collapsed to its `default` value, so
// strip it from the type.
type StripPseudoKeyed<T> =
  T extends PseudoKeyedTransitionValue<infer U> ? U | U[] : T;
export type StripPseudoKeyedTypes<T> = {
  [P in keyof T]: StripPseudoKeyed<T[P]>;
};
