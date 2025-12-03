'use strict';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { LineProps } from 'react-native-svg';

import type { SvgStyleBuilderConfig } from './common';
import { commonSvgProps } from './common';

export const SVG_LINE_PROPERTIES_CONFIG: SvgStyleBuilderConfig<LineProps> = {
  ...commonSvgProps,
  x1: true,
  y1: true,
  x2: true,
  y2: true,
};
