'use strict';
// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { RadialGradientProps } from 'react-native-svg';

import type { SvgStyleBuilderConfig } from './common';
import { SVG_COMMON_WEB_PROPERTIES_CONFIG } from './common';

export const SVG_RADIAL_GRADIENT_WEB_PROPERTIES_CONFIG: SvgStyleBuilderConfig<RadialGradientProps> =
  {
    ...SVG_COMMON_WEB_PROPERTIES_CONFIG,
    cx: 'px',
    cy: 'px',
    r: 'px',
    fx: 'px',
    fy: 'px',
  };
