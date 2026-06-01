'use strict';
import type { Maybe, NonMutable, UnknownRecord } from '../..';

export type ValueProcessor<V = unknown> = (
  value: NonMutable<V>
) => Maybe<string> | Record<string, string>;

type ProcessedProps<P extends object> = {
  [K in keyof P]: string;
};

export type RuleBuildHandler<P extends object, R = Record<string, string>> = (
  props: ProcessedProps<P>
) => R;

type BuilderBase<P extends object, R = Record<string, string>> = {
  add(property: keyof P, value: P[keyof P]): void;
  build(): R;
};

export type RuleBuilder<
  P extends object,
  R = Record<string, string>,
> = BuilderBase<P, R>;

type PropertyAlias<P extends object> = {
  as: keyof P;
};

type PropertyValueConfigBase<P extends object> =
  | boolean // true - included, false - excluded
  | string // suffix
  | PropertyAlias<P>; // alias for another property

type PropsBuilderPropertyConfig<
  P extends object,
  K extends keyof P = keyof P,
> =
  | PropertyValueConfigBase<P>
  | RuleBuilder<UnknownRecord>
  | RuleBuilder<UnknownRecord, unknown>
  | {
      process?: ValueProcessor<NonNullable<P[K]>>; // for custom value processing
      name?: string; // for custom property name
    };

type RuleBuilderPropertyConfig<P extends object, K extends keyof P = keyof P> =
  | PropertyValueConfigBase<P>
  | {
      process?: ValueProcessor<NonNullable<P[K]>>; // for custom value processing
      name?: string; // for custom property name
    };

export type PropsBuilderConfig<P extends object> = {
  [K in keyof P]: PropsBuilderPropertyConfig<P, K>;
};

export type RuleBuilderConfig<P extends object> = {
  [K in keyof P]: RuleBuilderPropertyConfig<P, K>;
};
