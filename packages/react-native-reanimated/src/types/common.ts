'use strict';
import type { DependencyList, RefObject } from 'react';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import type { WorkletFunction } from 'react-native-worklets';

import type { AnyRecord, PlainStyle } from '../css/types';
import type { ViewDescriptorsSet } from '../ViewDescriptorsSet';

export type DefaultStyle = ViewStyle | TextStyle | ImageStyle;

type AnimatedUpdaterHandle<TStyle extends AnyRecord> = {
  viewDescriptors: ViewDescriptorsSet;
  initial: {
    value: TStyle;
    updater: () => TStyle;
  };
};

export type AnimatedStyleHandle<TStyle extends DefaultStyle = DefaultStyle> =
  AnimatedUpdaterHandle<TStyle>;

// --------

type JestAnimatedUpdaterHandle<TStyle extends AnyRecord = PlainStyle> =
  AnimatedUpdaterHandle<TStyle> & {
    jestAnimatedValues:
      | RefObject<TStyle>
      | RefObject<any /* TODO - replace wit AnimatedProps */>;
    toJSON: () => string;
  };

export type UseAnimatedUpdaterInternal<TStyle extends AnyRecord> = (
  updater: WorkletFunction<[], TStyle> | (() => TStyle),
  dependencies?: DependencyList | null,
  isAnimatedProps?: boolean
) => AnimatedUpdaterHandle<TStyle> | JestAnimatedUpdaterHandle<TStyle>;
