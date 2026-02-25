'use strict';

import type { NumberProp } from 'react-native-svg';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { CSSRadialGradientProps } from '../../../types';
import { processPercentage, processSVGGradientStops } from '../processors';
import type { SvgStyleBuilderConfig } from './common';

const percentageToKeysValueProcessor =
  (...keys: string[]) =>
  (value: NumberProp) => {
    const processed = processPercentage(value);
    return Object.fromEntries(keys.map((key) => [key, processed]));
  };

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
export const SVG_RADIAL_GRADIENT_PROPERTIES_CONFIG: SvgStyleBuilderConfig<CSSRadialGradientProps> =
  {
    r: { process: percentageToKeysValueProcessor('rx', 'ry') },
    rx: { process: processPercentage },
    ry: { process: processPercentage },
    cx: { process: percentageToKeysValueProcessor('cx', 'fx') },
    cy: { process: percentageToKeysValueProcessor('cy', 'fy') },
    fx: { process: processPercentage },
    fy: { process: processPercentage },
    gradient: { process: processSVGGradientStops },
    gradientUnits: {
      process: (gradinetUnits) => (gradinetUnits === 'userSpaceOnUse' ? 1 : 0),
    },
    // TODO: Implement 'gradientTransform'
    // gradientTransform: true,
  };
