'use strict';
import type { AnyRecord, Maybe, NonMutable } from '../..';

export type ValueProcessor<V = unknown> = (
  value: NonMutable<V>
) => Maybe<string> | Record<string, string>;

type ProcessedProps<P extends AnyRecord> = {
  [K in keyof P]: string;
};

export type StyleBuildHandler<P extends AnyRecord> = (
  props: ProcessedProps<P>,
  nameAliases: Record<string, string>
) => string | null;

export type RuleBuildHandler<P extends AnyRecord> = (
  props: ProcessedProps<P>
) => Record<string, string>;

type BuilderBase<P extends AnyRecord> = {
  add(property: keyof P, value: P[keyof P]): void;
  build(): Record<string, string>;
};

export type PropsBuilder<P extends AnyRecord> = BuilderBase<P> & {
  buildFrom(props: P): string | null;
};

export type RuleBuilder<P extends AnyRecord> = BuilderBase<P>;

type PropertyAlias<P extends AnyRecord> = {
  as: keyof P;
};

type PropertyValueConfigBase<P extends AnyRecord> =
  | boolean // true - included, false - excluded
  | string // suffix
  | PropertyAlias<P>; // alias for another property

type PropsBuilderPropertyConfig<
  P extends AnyRecord,
  K extends keyof P = keyof P,
> =
  | PropertyValueConfigBase<P>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | RuleBuilder<any>
  | {
      process?: ValueProcessor<NonNullable<P[K]>>; // for custom value processing
      name?: string; // for custom property name
    };

type RuleBuilderPropertyConfig<
  P extends AnyRecord,
  K extends keyof P = keyof P,
> =
  | PropertyValueConfigBase<P>
  | {
      process?: ValueProcessor<NonNullable<P[K]>>; // for custom value processing
      name?: string; // for custom property name
    };

export type PropsBuilderConfig<P extends AnyRecord> = {
  [K in keyof P]: PropsBuilderPropertyConfig<P, K>;
};

export type RuleBuilderConfig<P extends AnyRecord> = {
  [K in keyof P]: RuleBuilderPropertyConfig<P, K>;
};

export type AnyBuilderConfig<P extends AnyRecord> =
  | PropsBuilderConfig<P>
  | RuleBuilderConfig<P>;
