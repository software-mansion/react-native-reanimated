'use strict';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { PolylineProps } from 'react-native-svg';

import { processPolylinePoints } from '../processors';
import type { SvgStyleBuilderConfig } from './common';
import { commonSvgProps } from './common';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
export const SVG_POLYLINE_PROPERTIES_CONFIG: SvgStyleBuilderConfig<PolylineProps> = {
  ...commonSvgProps,
  points: {process: processPolylinePoints}
};
