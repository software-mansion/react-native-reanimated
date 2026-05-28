'use strict';
// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { LinearGradientProps } from 'react-native-svg';

import type { SvgStyleBuilderConfig } from './common';
import { SVG_COMMON_WEB_PROPERTIES_CONFIG } from './common';

export const SVG_LINEAR_GRADIENT_WEB_PROPERTIES_CONFIG: SvgStyleBuilderConfig<LinearGradientProps> =
  {
    ...SVG_COMMON_WEB_PROPERTIES_CONFIG,
    x1: 'px',
    y1: 'px',
    x2: 'px',
    y2: 'px',
  };
