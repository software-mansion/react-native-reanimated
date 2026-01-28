'use strict';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { RadialGradientProps } from 'react-native-svg';

import {
  processSVGGradientStops,
  processSVGGradientUnits,
  processSVGRadialGradientFocalX,
  processSVGRadialGradientFocalY,
  processSVGRadialGradientRadius,
} from '../processors';
import type { SvgStyleBuilderConfig } from './common';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
export const SVG_RADIAL_GRADIENT_PROPERTIES_CONFIG: SvgStyleBuilderConfig<RadialGradientProps> =
  {
    r: { process: processSVGRadialGradientRadius },
    rx: true,
    ry: true,
    cx: { process: processSVGRadialGradientFocalX },
    cy: { process: processSVGRadialGradientFocalY },
    fx: true,
    fy: true,
    gradient: { process: processSVGGradientStops },
    gradientUnits: { process: processSVGGradientUnits },
    // gradientTransform // TODO: implement
  };
