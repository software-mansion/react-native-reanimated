'use strict';
import type { NumberProp } from 'react-native-svg';

import type { ValueProcessor } from '../../../../common';
import { processSVGPath } from './path';

function extractPolyPoints(points: string | ReadonlyArray<NumberProp>): string {
  const polyPoints = Array.isArray(points) ? points.join(',') : points;

  return (polyPoints as string)
    .replace(/([^eE])-/g, '$1 -')
    .split(/(?:\s+|\s*,\s*)/g)
    .join(' ');
}

export const processPolylinePoints: ValueProcessor<
  string | ReadonlyArray<NumberProp>
> = (points) => ({
  d: processSVGPath(`M${extractPolyPoints(points)}`),
});

export const processPolygonPoints: ValueProcessor<
  string | ReadonlyArray<NumberProp>
> = (points) => ({
  d: processSVGPath(`M${extractPolyPoints(points)}z`),
});
