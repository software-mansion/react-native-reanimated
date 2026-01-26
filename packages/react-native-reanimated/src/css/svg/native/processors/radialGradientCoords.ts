'use strict';
import type { NumberProp } from 'react-native-svg';

import type { ValueProcessor } from '../../../../common';

export const processSVGRadialGradientRadius: ValueProcessor<NumberProp> = (
  r
) => ({ rx: r, ry: r });

export const processSVGRadialGradientFocalX: ValueProcessor<NumberProp> = (
  cx
) => ({ fx: cx, cx: cx });

export const processSVGRadialGradientFocalY: ValueProcessor<NumberProp> = (
  cy
) => ({ fy: cy, cy: cy });
