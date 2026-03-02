'use strict';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { ImageProps } from 'react-native-svg';

import type { SvgStyleBuilderConfig } from './common';
import { SVG_COMMON_PROPERTIES_CONFIG } from './common';

// TODO:
// Currently if we provide width or height as 0 to RNSVG,
// it won't be handled properly. We should introduce some
// custom value that can't be set to 0,
// instead the zero would be rounded to sth like 0.000001.

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
export const SVG_IMAGE_PROPERTIES_CONFIG: SvgStyleBuilderConfig<ImageProps> = {
  ...SVG_COMMON_PROPERTIES_CONFIG,
  width: true,
  height: true,
  x: true,
  y: true,
  // TODO:
  // Check why 'preserveAspectRatio' is not supported in react-native-svg
  // and add support for this param:
  // preserveAspectRatio: { process: processPreserveAspectRatio },
};

// TODO:
// Check why 'preserveAspectRatio' is not supported in react-native-svg
// and add support for this param:
//
// const meetOrSliceTypes: {
//   [meetOrSlice: string]: number;
// } = {
//   meet: 0,
//   slice: 1,
//   none: 2,
// };

// const alignSet = new Set([
//   'xMinYMin',
//   'xMidYMin',
//   'xMaxYMin',
//   'xMinYMid',
//   'xMidYMid',
//   'xMaxYMid',
//   'xMinYMax',
//   'xMidYMax',
//   'xMaxYMax',
//   'none',
// ]);

// type PreserveAspectRatioProcessor = ValueProcessor<
//   string,
//   Record<string, string | number>
// >;

// const spacesRegExp = /\s+/;

// const processPreserveAspectRatio: PreserveAspectRatioProcessor = (value) => {
//   const modes = value ? value.trim().split(spacesRegExp) : [];
//   const align = modes[0];
//   const meetOrSlice = modes[1];

//   return {
//     align: alignSet.has(align) ? align : 'xMidYMid',
//     meetOrSlice: meetOrSliceTypes[meetOrSlice] || 0,
//   };
// };
