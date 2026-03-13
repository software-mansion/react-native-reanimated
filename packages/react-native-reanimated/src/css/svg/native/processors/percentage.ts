'use strict';
import type { NumberProp } from 'react-native-svg';

import type { ValueProcessor } from '../../../../common';

export const processPercentage: ValueProcessor<NumberProp, number> = (
  percentage
) => {
  const value =
    typeof percentage === 'string' && percentage.trim().endsWith('%')
      ? +percentage.slice(0, -1) / 100
      : +percentage;
  return isNaN(value) || value > 1 ? 1 : Math.max(value, 0);
};
