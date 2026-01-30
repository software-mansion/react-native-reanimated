'use strict';

import { type ValueProcessor } from '../../../../common';
import type { CSSGradientStop } from '../../../types';
import { processColorSVG } from './colors';
import { processOpacity } from './opacity';

export interface ProcessedGradientStop {
  offset: number;
  color: number | false | string;
  opacity: number;
}

export const processSVGGradientStops: ValueProcessor<
  CSSGradientStop[],
  ProcessedGradientStop[]
> = (stops) => {
  if (!stops || !Array.isArray(stops)) {
    return [];
  }

  const processed = stops.map((stop) => {
    const rawColor = stop.color && processColorSVG(stop.color);
    const stopOpacity =
      stop.opacity !== undefined ? processOpacity(stop.opacity) : 1;
    const finalColor =
      typeof rawColor === 'number' && typeof stopOpacity === 'number'
        ? ((Math.round(stopOpacity * 255) << 24) | (rawColor & 0x00ffffff)) >>>
          0
        : rawColor;

    return {
      offset: processOpacity(stop.offset || 0), // should we rename this processor?
      color: finalColor,
    } as ProcessedGradientStop;
  });

  return processed.sort((a, b) => {
    return Number(a.offset) - Number(b.offset);
  });
};
