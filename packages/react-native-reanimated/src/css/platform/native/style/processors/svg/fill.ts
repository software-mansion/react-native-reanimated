'use strict';
import type { FillRule } from 'react-native-svg';

import type { ValueProcessor } from '../../types';

const fillRules = {
  evenodd: 0,
  nonzero: 1,
};

// Implemented based on react-native-svg/src/lib/extract/extractFill.ts
export const processFillRule: ValueProcessor<FillRule, number> = (value) =>
  fillRules[value];
