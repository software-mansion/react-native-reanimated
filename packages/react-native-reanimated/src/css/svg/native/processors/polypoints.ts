'use strict';
import type { NumberProp } from 'react-native-svg';

import type { ValueProcessor } from '../../../../common';
import { processSVGPath } from './path';

export const processPolylinePoints: ValueProcessor<
  string | ReadonlyArray<NumberProp>
> = (points) => {
  const polyPoints = Array.isArray(points) ? points.join(',') : points;

  return {
    d: processSVGPath(
      `M${(polyPoints as string)
        .replace(/([^eE])-/g, '$1 -')
        .split(/(?:\s+|\s*,\s*)/g)
        .join(' ')}`
    ) as string,
  };
};
