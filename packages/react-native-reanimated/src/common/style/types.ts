'use strict';
import type { AnyRecord, ConfigPropertyAlias, ValueProcessor } from '../types';

type PropertyValueConfigBase<P extends AnyRecord> =
  | boolean // true - included, false - excluded
  | ConfigPropertyAlias<P>; // alias for another property

type PropsBuilderPropertyConfig<
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

export type PropsBuilderConfig<P extends AnyRecord = AnyRecord> = {
  [K in keyof Required<P>]: PropsBuilderPropertyConfig<P, K>;
};
