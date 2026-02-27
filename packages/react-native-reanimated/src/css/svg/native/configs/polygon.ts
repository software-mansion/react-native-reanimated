'use strict';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { PolygonProps } from 'react-native-svg';

import { processPolygonPoints } from '../processors';
import type { SvgStyleBuilderConfig } from './common';
import { SVG_COMMON_PROPERTIES_CONFIG } from './common';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
export const SVG_POLYGON_PROPERTIES_CONFIG: SvgStyleBuilderConfig<PolygonProps> =
  {
    ...SVG_COMMON_PROPERTIES_CONFIG,
    points: { process: processPolygonPoints },
  };
