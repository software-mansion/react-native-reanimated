'use strict';
// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { RectProps } from 'react-native-svg';

import type { SvgStyleBuilderConfig } from './common';
import { SVG_COMMON_WEB_PROPERTIES_CONFIG } from './common';

export const SVG_RECT_WEB_PROPERTIES_CONFIG: SvgStyleBuilderConfig<RectProps> =
  {
    ...SVG_COMMON_WEB_PROPERTIES_CONFIG,
    x: 'px',
    y: 'px',
    rx: 'px',
    ry: 'px',
    width: 'px',
    height: 'px',
  };
