'use strict';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import type { ConfigPropertyAlias, ValueProcessor } from '../types';

/**
 * Intersection of every React Native style type with deprecated props stripped.
 * Used internally by the props builder configs to enforce that the configs
 * cover every valid style key. Not part of the public API.
 */
export type AllStyleProps = Omit<
  ViewStyle & TextStyle & ImageStyle,
  | 'transformMatrix'
  | 'rotation'
  | 'scaleX'
  | 'scaleY'
  | 'translateX'
  | 'translateY'
>;

type PropertyValueConfigBase<P extends object> =
  | boolean // true - included, false - excluded
  | ConfigPropertyAlias<P>; // alias for another property

type PropsBuilderPropertyConfig<
  P extends object,
  K extends keyof P = keyof P,
> =
  | PropertyValueConfigBase<P>
  | {
      // value can have any type as it is passed to CPP where we can expect a different
      // type than in the React Native stylesheet (e.g. number for colors instead of string)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      process: ValueProcessor<Required<P>[K], any>; // for custom value processing
    };

export type PropsBuilderConfig<P extends object> = {
  [K in keyof Required<P>]: PropsBuilderPropertyConfig<P, K>;
};
