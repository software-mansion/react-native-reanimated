'use strict';

/*
 * The vast majority of the code exported by this module is a direct copy of the code from the culori package (see
 * https://culorijs.org/), which deserves full credit for it. In particular, code from the following path has been used:
 * - https://github.com/Evercoder/culori/tree/v4.0.1/src/lrgb
 */

// TODO Remove once we have the option to get a workletized version of the culori package
//   https://github.com/software-mansion/react-native-reanimated/pull/6782#pullrequestreview-2488830278

import type { RgbColor } from './Colors';

const channelFromLrgb = (c = 0) => {
  'worklet';
  const abs = Math.abs(c);
  if (abs > 0.0031308) {
    return (Math.sign(c) || 1) * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
  }
  return c * 12.92;
};

const convertLrgbToRgb = ({ r, g, b, alpha }: RgbColor): RgbColor => {
  'worklet';
  return {
    r: channelFromLrgb(r),
    g: channelFromLrgb(g),
    b: channelFromLrgb(b),
    alpha,
  };
};

const channelToLrgb = (c = 0) => {
  'worklet';
  const abs = Math.abs(c);
  if (abs <= 0.04045) {
    return c / 12.92;
  }
  return (Math.sign(c) || 1) * Math.pow((abs + 0.055) / 1.055, 2.4);
};

const convertRgbToLrgb = ({ r, g, b, alpha }: RgbColor) => {
  'worklet';
  return {
    r: channelToLrgb(r),
    g: channelToLrgb(g),
    b: channelToLrgb(b),
    alpha,
  };
};

export default {
  convert: {
    fromRgb: convertRgbToLrgb,
    toRgb: convertLrgbToRgb,
  },
};
