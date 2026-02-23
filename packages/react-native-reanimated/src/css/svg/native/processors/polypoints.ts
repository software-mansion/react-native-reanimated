'use strict';
import type { NumberProp } from 'react-native-svg';

import type { ValueProcessor } from '../../../../common';

export const processPolylinePoints: ValueProcessor<string | ReadonlyArray<NumberProp>> = (points) => {
    const polyPoints = Array.isArray(points) ? points.join(',') : points;

    return {d: `M${(polyPoints as string)
        .replace(/[^eE]-/, ' -')
        .split(/(?:\s+|\s*,\s*)/g)
        .join(' ')}`};
};
