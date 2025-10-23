'use strict';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { PathProps } from 'react-native-svg';

import type { SvgStyleBuilderConfig } from './common';
import { commonSvgProps } from './common';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
// @ts-ignore - remove when more properties are added
export const SVG_PATH_PROPERTIES_CONFIG: SvgStyleBuilderConfig<PathProps> = {
  ...commonSvgProps,
  // TODO - add more properties
};
