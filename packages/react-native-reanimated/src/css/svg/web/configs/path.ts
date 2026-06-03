'use strict';
// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { PathProps } from 'react-native-svg';

import type { ValueProcessor } from '../../../../common/web';
import type { SvgStyleBuilderConfig } from './common';
import { SVG_COMMON_WEB_PROPERTIES_CONFIG } from './common';

const processPathD: ValueProcessor<string> = (value) => `path("${value}")`;

export const SVG_PATH_WEB_PROPERTIES_CONFIG: SvgStyleBuilderConfig<PathProps> =
  {
    ...SVG_COMMON_WEB_PROPERTIES_CONFIG,
    d: { process: processPathD },
  };
