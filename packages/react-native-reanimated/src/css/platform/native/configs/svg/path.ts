'use strict';
import type { PathProps } from 'react-native-svg';

import type { SvgStyleBuilderConfig } from './common';
import { commonSvgProps } from './common';

// @ts-expect-error - remove when more properties are added
export const SVG_PATH_PROPERTIES_CONFIG: SvgStyleBuilderConfig<PathProps> = {
  ...commonSvgProps,
  // TODO - add more properties
};
