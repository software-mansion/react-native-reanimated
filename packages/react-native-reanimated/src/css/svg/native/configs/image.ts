'use strict';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
import type { ImageProps } from 'react-native-svg';

import type { SvgStyleBuilderConfig } from './common';
import { commonSvgProps } from './common';

// TODO: Fix me
// @ts-ignore RNSVG doesn't export types for web, see https://github.com/software-mansion/react-native-svg/pull/2801
export const SVG_IMAGE_PROPERTIES_CONFIG: SvgStyleBuilderConfig<ImageProps> = {
  ...commonSvgProps,
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

// const alignEnum: { [align: string]: string } = [
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
// ].reduce((prev: { [align: string]: string }, name) => {
//   prev[name] = name;
//   return prev;
// }, {});

// type PreserveAspectRatioProcessor = ValueProcessor<
//   string,
//   Record<string, string | Number>
// >;

// const spacesRegExp = /\s+/;

// const processPreserveAspectRatio: PreserveAspectRatioProcessor = (value) => {
//   const modes = value
//     ? value.trim().split(spacesRegExp)
//     : [];
//   const align = modes[0];
//   const meetOrSlice = modes[1];

//   return ({
//     // align: alignEnum[align] || 'xMidYMid',
//     // meetOrSlice: meetOrSliceTypes[meetOrSlice] || 0,
//     align: 'xMaxYMid', //hardcoded, delte later
//     meetOrSlice: 0,
//   });
// };
