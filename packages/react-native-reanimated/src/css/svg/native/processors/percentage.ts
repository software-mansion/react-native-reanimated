'use strict';
import type { NumberProp } from 'react-native-svg';

import type { ValueProcessor } from '../../../../common';

export const processPercentage = ((percentage: NumberProp) => {
  const value =
    typeof percentage === 'string' && percentage.endsWith('%')
      ? +percentage.slice(0, -1) / 100
      : +percentage;
  return isNaN(value) || value > 1 ? 1 : Math.max(value, 0);
}) satisfies ValueProcessor<NumberProp, number>;
