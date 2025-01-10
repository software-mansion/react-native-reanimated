import type { AnyRecord, Maybe } from '../../../types';

export type ValueProcessor<V> = (
  value: V
) => Maybe<string> | Record<string, string>;

export type ProcessedProps<P extends AnyRecord> = {
  [K in keyof P]: string;
};

export type BuildHandler<P extends AnyRecord> = (
  props: ProcessedProps<P>,
  nameAliases: Record<string, string>
) => string;

export type StyleBuilder<P extends AnyRecord> = {
  add(property: keyof P, value: P[keyof P]): void;
  build(): string | null;
  buildFrom(props: P): string | null;
};

export type PropertyAlias<P extends AnyRecord> = {
  as: keyof P;
};

type PropertyValueConfigBase<P extends AnyRecord> =
  | boolean // true - included, false - excluded
  | string // suffix
  | PropertyAlias<P>; // alias for another property

type StyleBuilderPropertyConfig<
  P extends AnyRecord,
  K extends keyof P = keyof P,
> =
  | PropertyValueConfigBase<P>
  | {
      process?: ValueProcessor<Required<P>[K]>; // for custom value processing
      name?: string; // for custom property name
    };

export type StyleBuilderConfig<P extends AnyRecord> = {
  [K in keyof Required<P>]: StyleBuilderPropertyConfig<P, K>;
};
