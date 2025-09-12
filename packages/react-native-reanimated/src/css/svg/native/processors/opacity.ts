'use strict';
import type { NumberProp } from 'react-native-svg';

import type { ValueProcessor } from '../../../native';

export const processOpacity: ValueProcessor<NumberProp, number> = (opacity) => {
  const value =
    typeof opacity === 'string' && opacity.trim().endsWith('%')
      ? +opacity.slice(0, -1) / 100
      : +opacity;
  return isNaN(value) || value > 1 ? 1 : Math.max(value, 0);
};
