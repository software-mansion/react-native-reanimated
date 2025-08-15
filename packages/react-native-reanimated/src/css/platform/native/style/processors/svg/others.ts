'use strict';
import type { ValueProcessor } from '../../types';

export const convertStringToNumber =
  <S extends string>(
    conversions: Record<S, number>
  ): ValueProcessor<S, number> =>
  (value) =>
    conversions[value];
