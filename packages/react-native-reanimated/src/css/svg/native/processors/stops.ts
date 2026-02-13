'use strict';

import { logger, type ValueProcessor } from '../../../../common';
import type { CSSGradientStop } from '../../../types';
import { processColorSVG } from './colors';
import { processPercentage } from './percentage';

interface ProcessedGradientStop {
  offset: number;
  color: number | false | string;
  opacity: number;
}

const NO_STOPS_WARNING = 'No stops in SVG gradient';

export const processSVGGradientStops = ((stops) => {
  if (!stops || !Array.isArray(stops) || stops.length === 0) {
    logger.warn(NO_STOPS_WARNING);
    return [];
  }
  const processed = stops.map((stop) => {
    const rawColor = stop.color && processColorSVG(stop.color);
    const stopOpacity = stop.opacity !== processPercentage(stop.opacity ?? 1);
    const finalColor =
      typeof rawColor === 'number' && typeof stopOpacity === 'number'
        ? ((Math.round(((rawColor >>> 24) & 0xff) * stopOpacity) << 24) |
            (rawColor & 0x00ffffff)) >>>
          0
        : rawColor;
    return {
      offset: processPercentage(stop.offset ?? 0),
      color: finalColor,
    } as ProcessedGradientStop;
  });
  return processed.sort((a, b) => Number(a.offset) - Number(b.offset));
}) satisfies ValueProcessor<CSSGradientStop[], ProcessedGradientStop[]>;
