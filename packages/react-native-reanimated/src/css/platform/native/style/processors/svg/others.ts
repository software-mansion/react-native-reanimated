'use strict';
import type { NumberArray, NumberProp } from 'react-native-svg';

import type { ValueProcessor } from '../../types';

export const convertPercentageToNumber: ValueProcessor<NumberProp, number> = (
  value
) => (typeof value === 'number' ? value : parseFloat(value) / 100);

export const convertStringToNumber =
  <S extends string>(
    conversions: Record<S, number>
  ): ValueProcessor<S, number> =>
  (value) =>
    conversions[value];

export const splitIntoSeparateProps =
  <S extends string>(
    props: S[]
  ): ValueProcessor<NumberArray, Record<S, NumberProp>> =>
  (value) => {
    if (!props.length) {
      return {};
    }

    if (!Array.isArray(value)) {
      return { [props[0]]: value } as Record<S, NumberProp>;
    }

    if (value.length > props.length) {
      // RN SVG doesn't throw error if too many values are provided and justs
      // ignores the invalid property. We do the same here and return an empty
      // object in this case.
      return {};
    }

    return Object.fromEntries(value.map((v, i) => [props[i], v])) as Record<
      S,
      NumberProp
    >;
  };
