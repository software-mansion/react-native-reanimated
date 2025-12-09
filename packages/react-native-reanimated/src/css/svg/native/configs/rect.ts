'use strict';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { RectProps } from 'react-native-svg';

import type { SvgStyleBuilderConfig } from './common';
import { commonSvgProps } from './common';

export const SVG_RECT_PROPERTIES_CONFIG: SvgStyleBuilderConfig<RectProps> = {
  ...commonSvgProps,
  x: true,
  y: true,
  rx: true,
  ry: true,
  width: true,
  height: true,
};
