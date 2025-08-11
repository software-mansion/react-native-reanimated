'use strict';
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
  opacity: true,
};
