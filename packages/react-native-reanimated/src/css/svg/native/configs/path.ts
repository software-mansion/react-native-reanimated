'use strict';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { PathProps } from 'react-native-svg';

import { processPercentage, processSVGPath } from '../processors';
import type { SvgStyleBuilderConfig } from './common';
import { commonSvgProps } from './common';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
export const SVG_PATH_PROPERTIES_CONFIG: SvgStyleBuilderConfig<PathProps> = {
  ...commonSvgProps,
  d: { process: processSVGPath },
  opacity: { process: processPercentage },
};
