'use strict';
import type { EllipseProps } from 'react-native-svg';

import type { SvgStyleBuilderConfig } from './common';
import { commonSvgProps } from './common';

export const SVG_ELLIPSE_PROPERTIES_CONFIG: SvgStyleBuilderConfig<EllipseProps> =
  {
    ...commonSvgProps,
    cx: true,
    cy: true,
    rx: true,
    ry: true,
    opacity: true,
  };
