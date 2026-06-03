'use strict';
// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { PolylineProps } from 'react-native-svg';

import { pointsToPathD } from '../processors';
import type { SvgStyleBuilderConfig } from './common';
import { SVG_COMMON_WEB_PROPERTIES_CONFIG } from './common';

export const SVG_POLYLINE_WEB_PROPERTIES_CONFIG: SvgStyleBuilderConfig<PolylineProps> =
  {
    ...SVG_COMMON_WEB_PROPERTIES_CONFIG,
    points: { name: 'd', process: pointsToPathD(false) },
  };
