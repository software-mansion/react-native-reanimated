'use strict';

/*
 * The vast majority of the code exported by this module is a direct copy of the code from the culori package (see
 * https://culorijs.org/), which deserves full credit for it. In particular, code from the following path has been used:
 * - https://github.com/Evercoder/culori/tree/v4.0.1/src/oklab
 */
// TODO Once we have the option to workletize external dependencies, we can replace most of the code below with
//  a simple implementation based on their converter utils (see
//  https://github.com/software-mansion/react-native-reanimated/pull/6782#pullrequestreview-2488830278,
//  https://culorijs.org/api/#converter).
import lrgb from "./lrgb.js";
function convertLrgbToOklab({
  r = 0,
  g = 0,
  b = 0,
  alpha
}) {
  'worklet';

  const L = Math.cbrt(0.41222147079999993 * r + 0.5363325363 * g + 0.0514459929 * b);
  const M = Math.cbrt(0.2119034981999999 * r + 0.6806995450999999 * g + 0.1073969566 * b);
  const S = Math.cbrt(0.08830246189999998 * r + 0.2817188376 * g + 0.6299787005000002 * b);
  return {
    l: 0.2104542553 * L + 0.793617785 * M - 0.0040720468 * S,
    a: 1.9779984951 * L - 2.428592205 * M + 0.4505937099 * S,
    b: 0.0259040371 * L + 0.7827717662 * M - 0.808675766 * S,
    alpha
  };
}
function convertRgbToOklab(rgb) {
  'worklet';

  const lrgbColor = lrgb.convert.fromRgb(rgb);
  const result = convertLrgbToOklab(lrgbColor);
  if (rgb.r === rgb.b && rgb.b === rgb.g) {
    result.a = result.b = 0;
  }
  return result;
}
function convertOklabToLrgb({
  l = 0,
  a = 0,
  b = 0,
  alpha
}) {
  'worklet';

  /* eslint-disable no-loss-of-precision */
  const L = Math.pow(l * 0.99999999845051981432 + 0.39633779217376785678 * a + 0.21580375806075880339 * b, 3);
  const M = Math.pow(l * 1.0000000088817607767 - 0.1055613423236563494 * a - 0.063854174771705903402 * b, 3);
  const S = Math.pow(l * 1.0000000546724109177 - 0.089484182094965759684 * a - 1.2914855378640917399 * b, 3);
  return {
    r: +4.076741661347994 * L - 3.307711590408193 * M + 0.230969928729428 * S,
    g: -1.2684380040921763 * L + 2.6097574006633715 * M - 0.3413193963102197 * S,
    b: -0.004196086541837188 * L - 0.7034186144594493 * M + 1.7076147009309444 * S,
    alpha
  };
  /* eslint-enable no-loss-of-precision */
}
function convertOklabToRgb(labColor) {
  'worklet';

  const roundChannel = channel => Math.ceil(channel * 100_000) / 100_000;
  const lrgbColor = convertOklabToLrgb(labColor);
  const rgbColor = lrgb.convert.toRgb(lrgbColor);
  rgbColor.r = roundChannel(rgbColor.r);
  rgbColor.g = roundChannel(rgbColor.g);
  rgbColor.b = roundChannel(rgbColor.b);
  return rgbColor;
}
export default {
  convert: {
    fromRgb: convertRgbToOklab,
    toRgb: convertOklabToRgb
  }
};
//# sourceMappingURL=oklab.js.map