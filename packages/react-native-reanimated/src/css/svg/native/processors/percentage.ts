'use strict';
import type { NumberProp } from 'react-native-svg';

import type { ValueProcessor } from '../../../../common';

export const processPercentage: ValueProcessor<NumberProp, number> = (
  percentage
) => {
  const trimmed =
    typeof percentage === 'string' ? percentage.trim() : percentage;
  const value =
    typeof trimmed === 'string' && trimmed.endsWith('%')
      ? +trimmed.slice(0, -1) / 100
      : +trimmed;
  return isNaN(value) || value > 1 ? 1 : Math.max(value, 0);
};
