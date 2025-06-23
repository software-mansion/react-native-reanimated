'use strict';
import type { Maybe } from '../../../../common';
import type { AnyRecord, ConfigPropertyAlias } from '../../../types';

export type ValueProcessor<V, R = V> = (
  value: V
) => Maybe<R> | Record<string, R>;

export type BuildHandler<P extends AnyRecord> = (props: P) => P;

export type StyleBuilder<P extends AnyRecord> = {
  add(property: keyof P, value: P[keyof P]): void;
  buildFrom(props: P): P | null;
};

type PropertyValueConfigBase<P extends AnyRecord> =
  | boolean // true - included, false - excluded
  | ConfigPropertyAlias<P>; // alias for another property

type StyleBuilderPropertyConfig<
  P extends AnyRecord,
  K extends keyof P = keyof P,
> =
  | PropertyValueConfigBase<P>
  | {
      // value can have any type as it is passed to CPP where we can expect a different
      // type than in the React Native stylesheet (e.g. number for colors instead of string)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      process: ValueProcessor<Required<P>[K], any>; // for custom value processing
    };

export type StyleBuilderConfig<P extends AnyRecord> = {
  [K in keyof Required<P>]: StyleBuilderPropertyConfig<P, K>;
};
