'use strict';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { CSSRadialGradientProps } from '../types';

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
export const SVG_RADIAL_GRADIENT_PROPERTIES_CONFIG: SvgStyleBuilderConfig<CSSRadialGradientProps> =
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
