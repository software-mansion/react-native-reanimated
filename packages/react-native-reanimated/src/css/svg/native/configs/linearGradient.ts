'use strict';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { CSSLinearGradientProps } from '../../../types';
import { processPercentage, processSVGGradientStops } from '../processors';
import type { SvgStyleBuilderConfig } from './common';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
export const SVG_LINEAR_GRADIENT_PROPERTIES_CONFIG: SvgStyleBuilderConfig<CSSLinearGradientProps> =
  {
    x1: { process: processPercentage },
    x2: { process: processPercentage },
    y1: { process: processPercentage },
    y2: { process: processPercentage },
    gradient: { process: processSVGGradientStops },
    gradientUnits: {
      process: (gradinetUnits) => (gradinetUnits === 'userSpaceOnUse' ? 1 : 0),
    },
    // TODO: implement 'gradientTransform'
    // gradientTransform: true,
  };
