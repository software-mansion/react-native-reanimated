import type { AnyRecord, Maybe } from '../../types';

export type ValueProcessor<V> = (value: V) => Maybe<string>;

export type ProcessedProps<P extends AnyRecord> = {
  [K in keyof P]: string;
};

export type BuildHandler<P extends AnyRecord> = (
  props: ProcessedProps<P>,
  nameAliases: Record<string, string>
) => string;

export type StyleBuilder<P extends AnyRecord> = {
  add(property: keyof P, value: P[keyof P]): void;
  build(): string;
  buildFrom(props: P): string;
};

export type PropertyAlias<P extends AnyRecord> = {
  as: keyof P;
};

type PropertyValueConfigBase<P extends AnyRecord> =
  | boolean // true - included, false - excluded
  | string // suffix
  | PropertyAlias<P>; // alias for another property

type RuleBuilderPropertyConfig<
  P extends AnyRecord,
  K extends keyof P = keyof P,
> =
  | PropertyValueConfigBase<P>
  | {
      process: ValueProcessor<Required<P>[K]>; // for custom value processing
    };

type StyleBuilderPropertyConfig<
  P extends AnyRecord,
  K extends keyof P = keyof P,
> =
  | PropertyValueConfigBase<P>
  | {
      process?: ValueProcessor<Required<P>[K]>; // for custom value processing
      name?: string; // for custom property name
    };

export type RuleBuilderConfig<P extends AnyRecord> = {
  [K in keyof P]: RuleBuilderPropertyConfig<P, K>;
};

export type StyleBuilderConfig<P extends AnyRecord> = {
  [K in keyof P]: StyleBuilderPropertyConfig<P, K>;
};

// That's good for now, since the style builder properties config is the
// same as the rule builder properties config with additional props
export type AnyBuilderPropertiesConfig<P extends AnyRecord> =
  StyleBuilderConfig<P>;
