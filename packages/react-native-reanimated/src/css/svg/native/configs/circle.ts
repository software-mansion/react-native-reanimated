'use strict';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { CircleProps } from 'react-native-svg';

import type { SvgStyleBuilderConfig } from './common';
import { SVG_COMMON_PROPERTIES_CONFIG } from './common';

export const SVG_CIRCLE_PROPERTIES_CONFIG: SvgStyleBuilderConfig<CircleProps> =
  {
    ...SVG_COMMON_PROPERTIES_CONFIG,
    cx: true,
    cy: true,
    r: true,
  };
