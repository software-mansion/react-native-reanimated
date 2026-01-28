'use strict';
import type { Units } from 'react-native-svg';

import type { ValueProcessor } from '../../../../common';

const UNIT_MAP: Record<Units, number> = {
  objectBoundingBox: 0,
  userSpaceOnUse: 1,
};

export const processSVGGradientUnits: ValueProcessor<Units, number> = (
  gradientUnits
) => (gradientUnits ? UNIT_MAP[gradientUnits] : 0);
