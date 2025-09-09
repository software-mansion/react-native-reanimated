'use strict';
import type { CircleProps } from 'react-native-svg';

import { processOpacity } from '../processors';
import type { SvgStyleBuilderConfig } from './common';
import { commonSvgProps } from './common';

export const SVG_CIRCLE_PROPERTIES_CONFIG: SvgStyleBuilderConfig<CircleProps> =
  {
    ...commonSvgProps,
    cx: true,
    cy: true,
    r: true,
    opacity: { process: processOpacity },
  };
