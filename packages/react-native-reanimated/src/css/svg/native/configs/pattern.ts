'use strict';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { CSSPatternProps } from '../../../types';
import type { SvgStyleBuilderConfig } from './common';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
export const SVG_PATTERN_PROPERTIES_CONFIG: SvgStyleBuilderConfig<CSSPatternProps> =
  {
    x: true,
    y: true,
    width: true,
    height: true,
    patternUnits: {
      process: (patternUnits) => (patternUnits === 'userSpaceOnUse' ? 1 : 0),
    },
    patternContentUnits: {
      process: (patternContentUnits) =>
        patternContentUnits === 'userSpaceOnUse' ? 1 : 0,
    },
    // TODO: Implement 'patternTransform'
    // patternTransform: true,
  };
