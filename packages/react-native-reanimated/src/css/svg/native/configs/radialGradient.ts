'use strict';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { CSSRadialGradientProps } from '../../../types';
import { processSVGGradientStops } from '../processors';
import type { SvgStyleBuilderConfig } from './common';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
export const SVG_RADIAL_GRADIENT_PROPERTIES_CONFIG: SvgStyleBuilderConfig<CSSRadialGradientProps> =
  {
    r: { process: (r) => ({ rx: r, ry: r }) },
    rx: true,
    ry: true,
    cx: { process: (cx) => ({ fx: cx, cx }) },
    cy: { process: (cy) => ({ fy: cy, cy }) },
    fx: true,
    fy: true,
    gradient: { process: processSVGGradientStops },
    gradientUnits: {
      process: (gradinetUnits) => (gradinetUnits === 'userSpaceOnUse' ? 1 : 0),
    },
    // TODO: Implement 'gradientTransform'
    // gradientTransform: true,
  };
