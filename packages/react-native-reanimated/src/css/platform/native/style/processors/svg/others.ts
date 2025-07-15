'use strict';
import type { ValueProcessor } from '../../types';

export const convertPercentageToNumber: ValueProcessor<
  number | string,
  number
> = (value) => (typeof value === 'number' ? value : parseFloat(value) / 100);
