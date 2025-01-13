'use strict';
/**
 * Copied from: react-native/Libraries/StyleSheet/normalizeColor.js
 * react-native/Libraries/StyleSheet/processColor.js
 * https://github.com/wcandillon/react-native-redash/blob/master/src/Colors.ts
 */

/* eslint no-bitwise: 0 */
import type { StyleProps } from './commonTypes';
import { makeShareable } from './core';
import { isAndroid } from './PlatformChecker';

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSV {
  h: number;
  s: number;
  v: number;
}

const NUMBER: string = '[-+]?\\d*\\.?\\d+';
const PERCENTAGE = NUMBER + '%';

function call(...args: (RegExp | string)[]) {
  return '\\(\\s*(' + args.join(')\\s*,?\\s*(') + ')\\s*\\)';
}

function callWithSlashSeparator(...args: (RegExp | string)[]) {
  return (
    '\\(\\s*(' +
    args.slice(0, args.length - 1).join(')\\s*,?\\s*(') +
    ')\\s*/\\s*(' +
    args[args.length - 1] +
    ')\\s*\\)'
  );
}

function commaSeparatedCall(...args: (RegExp | string)[]) {
  return '\\(\\s*(' + args.join(')\\s*,\\s*(') + ')\\s*\\)';
}

const MATCHERS = {
  rgb: new RegExp('rgb' + call(NUMBER, NUMBER, NUMBER)),
  rgba: new RegExp(
    'rgba(' +
      commaSeparatedCall(NUMBER, NUMBER, NUMBER, NUMBER) +
      '|' +
      callWithSlashSeparator(NUMBER, NUMBER, NUMBER, NUMBER) +
      ')'
  ),
  hsl: new RegExp('hsl' + call(NUMBER, PERCENTAGE, PERCENTAGE)),
  hsla: new RegExp(
    'hsla(' +
      commaSeparatedCall(NUMBER, PERCENTAGE, PERCENTAGE, NUMBER) +
      '|' +
      callWithSlashSeparator(NUMBER, PERCENTAGE, PERCENTAGE, NUMBER) +
      ')'
  ),
  hwb: new RegExp('hwb' + call(NUMBER, PERCENTAGE, PERCENTAGE)),
  hex3: /^#([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
  hex4: /^#([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
  hex6: /^#([0-9a-fA-F]{6})$/,
  hex8: /^#([0-9a-fA-F]{8})$/,
};

function hue2rgb(p: number, q: number, t: number): number {
  'worklet';
  if (t < 0) {
    t += 1;
  }
  if (t > 1) {
    t -= 1;
  }
  if (t < 1 / 6) {
    return p + (q - p) * 6 * t;
  }
  if (t < 1 / 2) {
    return q;
  }
  if (t < 2 / 3) {
    return p + (q - p) * (2 / 3 - t) * 6;
  }
  return p;
}

function hslToRgb(h: number, s: number, l: number): number {
  'worklet';
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);

  return (
    (Math.round(r * 255) << 24) |
    (Math.round(g * 255) << 16) |
    (Math.round(b * 255) << 8)
  );
}

function hwbToRgb(h: number, w: number, b: number): number {
  'worklet';
  if (w + b >= 1) {
    const gray = Math.round((w * 255) / (w + b));

    return (gray << 24) | (gray << 16) | (gray << 8);
  }

  const red = hue2rgb(0, 1, h + 1 / 3) * (1 - w - b) + w;
  const green = hue2rgb(0, 1, h) * (1 - w - b) + w;
  const blue = hue2rgb(0, 1, h - 1 / 3) * (1 - w - b) + w;

  return (
    (Math.round(red * 255) << 24) |
    (Math.round(green * 255) << 16) |
    (Math.round(blue * 255) << 8)
  );
}

function parse255(str: string): number {
  'worklet';
  const int = Number.parseInt(str, 10);
  if (int < 0) {
    return 0;
  }
  if (int > 255) {
    return 255;
  }
  return int;
}

function parse360(str: string): number {
  'worklet';
  const int = Number.parseFloat(str);
  return (((int % 360) + 360) % 360) / 360;
}

function parse1(str: string): number {
  'worklet';
  const num = Number.parseFloat(str);
  if (num < 0) {
    return 0;
  }
  if (num > 1) {
    return 255;
  }
  return Math.round(num * 255);
}

function parsePercentage(str: string): number {
  'worklet';
  // parseFloat conveniently ignores the final %
  const int = Number.parseFloat(str);
  if (int < 0) {
    return 0;
  }
  if (int > 100) {
    return 1;
  }
  return int / 100;
}

const names: Record<string, number> = makeShareable({
  transparent: 0x00000000,

  /* spell-checker: disable */
  // http://www.w3.org/TR/css3-color/#svg-color
  aliceblue: 0xf0f8ffff,
  antiquewhite: 0xfaebd7ff,
  aqua: 0x00ffffff,
  aquamarine: 0x7fffd4ff,
  azure: 0xf0ffffff,
  beige: 0xf5f5dcff,
  bisque: 0xffe4c4ff,
  black: 0x000000ff,
  blanchedalmond: 0xffebcdff,
  blue: 0x0000ffff,
  blueviolet: 0x8a2be2ff,
  brown: 0xa52a2aff,
  burlywood: 0xdeb887ff,
  burntsienna: 0xea7e5dff,
  cadetblue: 0x5f9ea0ff,
  chartreuse: 0x7fff00ff,
  chocolate: 0xd2691eff,
  coral: 0xff7f50ff,
  cornflowerblue: 0x6495edff,
  cornsilk: 0xfff8dcff,
  crimson: 0xdc143cff,
  cyan: 0x00ffffff,
  darkblue: 0x00008bff,
  darkcyan: 0x008b8bff,
  darkgoldenrod: 0xb8860bff,
  darkgray: 0xa9a9a9ff,
  darkgreen: 0x006400ff,
  darkgrey: 0xa9a9a9ff,
  darkkhaki: 0xbdb76bff,
  darkmagenta: 0x8b008bff,
  darkolivegreen: 0x556b2fff,
  darkorange: 0xff8c00ff,
  darkorchid: 0x9932ccff,
  darkred: 0x8b0000ff,
  darksalmon: 0xe9967aff,
  darkseagreen: 0x8fbc8fff,
  darkslateblue: 0x483d8bff,
  darkslategray: 0x2f4f4fff,
  darkslategrey: 0x2f4f4fff,
  darkturquoise: 0x00ced1ff,
  darkviolet: 0x9400d3ff,
  deeppink: 0xff1493ff,
  deepskyblue: 0x00bfffff,
  dimgray: 0x696969ff,
  dimgrey: 0x696969ff,
  dodgerblue: 0x1e90ffff,
  firebrick: 0xb22222ff,
  floralwhite: 0xfffaf0ff,
  forestgreen: 0x228b22ff,
  fuchsia: 0xff00ffff,
  gainsboro: 0xdcdcdcff,
  ghostwhite: 0xf8f8ffff,
  gold: 0xffd700ff,
  goldenrod: 0xdaa520ff,
  gray: 0x808080ff,
  green: 0x008000ff,
  greenyellow: 0xadff2fff,
  grey: 0x808080ff,
  honeydew: 0xf0fff0ff,
  hotpink: 0xff69b4ff,
  indianred: 0xcd5c5cff,
  indigo: 0x4b0082ff,
  ivory: 0xfffff0ff,
  khaki: 0xf0e68cff,
  lavender: 0xe6e6faff,
  lavenderblush: 0xfff0f5ff,
  lawngreen: 0x7cfc00ff,
  lemonchiffon: 0xfffacdff,
  lightblue: 0xadd8e6ff,
  lightcoral: 0xf08080ff,
  lightcyan: 0xe0ffffff,
  lightgoldenrodyellow: 0xfafad2ff,
  lightgray: 0xd3d3d3ff,
  lightgreen: 0x90ee90ff,
  lightgrey: 0xd3d3d3ff,
  lightpink: 0xffb6c1ff,
  lightsalmon: 0xffa07aff,
  lightseagreen: 0x20b2aaff,
  lightskyblue: 0x87cefaff,
  lightslategray: 0x778899ff,
  lightslategrey: 0x778899ff,
  lightsteelblue: 0xb0c4deff,
  lightyellow: 0xffffe0ff,
  lime: 0x00ff00ff,
  limegreen: 0x32cd32ff,
  linen: 0xfaf0e6ff,
  magenta: 0xff00ffff,
  maroon: 0x800000ff,
  mediumaquamarine: 0x66cdaaff,
  mediumblue: 0x0000cdff,
  mediumorchid: 0xba55d3ff,
  mediumpurple: 0x9370dbff,
  mediumseagreen: 0x3cb371ff,
  mediumslateblue: 0x7b68eeff,
  mediumspringgreen: 0x00fa9aff,
  mediumturquoise: 0x48d1ccff,
  mediumvioletred: 0xc71585ff,
  midnightblue: 0x191970ff,
  mintcream: 0xf5fffaff,
  mistyrose: 0xffe4e1ff,
  moccasin: 0xffe4b5ff,
  navajowhite: 0xffdeadff,
  navy: 0x000080ff,
  oldlace: 0xfdf5e6ff,
  olive: 0x808000ff,
  olivedrab: 0x6b8e23ff,
  orange: 0xffa500ff,
  orangered: 0xff4500ff,
  orchid: 0xda70d6ff,
  palegoldenrod: 0xeee8aaff,
  palegreen: 0x98fb98ff,
  paleturquoise: 0xafeeeeff,
  palevioletred: 0xdb7093ff,
  papayawhip: 0xffefd5ff,
  peachpuff: 0xffdab9ff,
  peru: 0xcd853fff,
  pink: 0xffc0cbff,
  plum: 0xdda0ddff,
  powderblue: 0xb0e0e6ff,
  purple: 0x800080ff,
  rebeccapurple: 0x663399ff,
  red: 0xff0000ff,
  rosybrown: 0xbc8f8fff,
  royalblue: 0x4169e1ff,
  saddlebrown: 0x8b4513ff,
  salmon: 0xfa8072ff,
  sandybrown: 0xf4a460ff,
  seagreen: 0x2e8b57ff,
  seashell: 0xfff5eeff,
  sienna: 0xa0522dff,
  silver: 0xc0c0c0ff,
  skyblue: 0x87ceebff,
  slateblue: 0x6a5acdff,
  slategray: 0x708090ff,
  slategrey: 0x708090ff,
  snow: 0xfffafaff,
  springgreen: 0x00ff7fff,
  steelblue: 0x4682b4ff,
  tan: 0xd2b48cff,
  teal: 0x008080ff,
  thistle: 0xd8bfd8ff,
  tomato: 0xff6347ff,
  turquoise: 0x40e0d0ff,
  violet: 0xee82eeff,
  wheat: 0xf5deb3ff,
  white: 0xffffffff,
  whitesmoke: 0xf5f5f5ff,
  yellow: 0xffff00ff,
  yellowgreen: 0x9acd32ff,
  /* spell-checker: enable */
});

// copied from react-native/Libraries/Components/View/ReactNativeStyleAttributes
export const ColorProperties = makeShareable([
  'backgroundColor',
  'borderBottomColor',
  'borderColor',
  'borderLeftColor',
  'borderRightColor',
  'borderTopColor',
  'borderStartColor',
  'borderEndColor',
  'borderBlockColor',
  'borderBlockEndColor',
  'borderBlockStartColor',
  'color',
  'outlineColor',
  'shadowColor',
  'textDecorationColor',
  'tintColor',
  'textShadowColor',
  'overlayColor',
  // SVG color properties
  'fill',
  'floodColor',
  'lightingColor',
  'stopColor',
  'stroke',
]);

// // ts-prune-ignore-next Exported for the purpose of tests only
export function normalizeColor(color: unknown): number | null {
  'worklet';

  if (typeof color === 'number') {
    if (color >>> 0 === color && color >= 0 && color <= 0xffffffff) {
      return color;
    }
    return null;
  }

  if (typeof color !== 'string') {
    return null;
  }

  let match: RegExpExecArray | null | undefined;

  // Ordered based on occurrences on Facebook codebase
  if ((match = MATCHERS.hex6.exec(color))) {
    return Number.parseInt(match[1] + 'ff', 16) >>> 0;
  }

  if (names[color] !== undefined) {
    return names[color];
  }

  if ((match = MATCHERS.rgb.exec(color))) {
    return (
      // b
      ((parse255(match[1]) << 24) | // r
        (parse255(match[2]) << 16) | // g
        (parse255(match[3]) << 8) |
        0x000000ff) >>> // a
      0
    );
  }

  if ((match = MATCHERS.rgba.exec(color))) {
    // rgba(R G B / A) notation
    if (match[6] !== undefined) {
      return (
        ((parse255(match[6]) << 24) | // r
          (parse255(match[7]) << 16) | // g
          (parse255(match[8]) << 8) | // b
          parse1(match[9])) >>> // a
        0
      );
    }

    // rgba(R, G, B, A) notation
    return (
      ((parse255(match[2]) << 24) | // r
        (parse255(match[3]) << 16) | // g
        (parse255(match[4]) << 8) | // b
        parse1(match[5])) >>> // a
      0
    );
  }

  if ((match = MATCHERS.hex3.exec(color))) {
    return (
      Number.parseInt(
        match[1] +
          match[1] + // r
          match[2] +
          match[2] + // g
          match[3] +
          match[3] + // b
          'ff', // a
        16
      ) >>> 0
    );
  }

  // https://drafts.csswg.org/css-color-4/#hex-notation
  if ((match = MATCHERS.hex8.exec(color))) {
    return Number.parseInt(match[1], 16) >>> 0;
  }

  if ((match = MATCHERS.hex4.exec(color))) {
    return (
      Number.parseInt(
        match[1] +
          match[1] + // r
          match[2] +
          match[2] + // g
          match[3] +
          match[3] + // b
          match[4] +
          match[4], // a
        16
      ) >>> 0
    );
  }

  if ((match = MATCHERS.hsl.exec(color))) {
    return (
      (hslToRgb(
        parse360(match[1]), // h
        parsePercentage(match[2]), // s
        parsePercentage(match[3]) // l
      ) |
        0x000000ff) >>> // a
      0
    );
  }

  if ((match = MATCHERS.hsla.exec(color))) {
    // hsla(H S L / A) notation
    if (match[6] !== undefined) {
      return (
        (hslToRgb(
          parse360(match[6]), // h
          parsePercentage(match[7]), // s
          parsePercentage(match[8]) // l
        ) |
          parse1(match[9])) >>> // a
        0
      );
    }

    // hsla(H, S, L, A) notation
    return (
      (hslToRgb(
        parse360(match[2]), // h
        parsePercentage(match[3]), // s
        parsePercentage(match[4]) // l
      ) |
        parse1(match[5])) >>> // a
      0
    );
  }

  if ((match = MATCHERS.hwb.exec(color))) {
    return (
      (hwbToRgb(
        parse360(match[1]), // h
        parsePercentage(match[2]), // w
        parsePercentage(match[3]) // b
      ) |
        0x000000ff) >>> // a
      0
    );
  }

  return null;
}

export const opacity = (c: number): number => {
  'worklet';
  return ((c >> 24) & 255) / 255;
};

export const red = (c: number): number => {
  'worklet';
  return (c >> 16) & 255;
};

export const green = (c: number): number => {
  'worklet';
  return (c >> 8) & 255;
};

export const blue = (c: number): number => {
  'worklet';
  return c & 255;
};

export const rgbaColor = (
  r: number,
  g: number,
  b: number,
  alpha = 1
): number | string => {
  'worklet';
  // Replace tiny values like 1.234e-11 with 0:
  const safeAlpha = alpha < 0.001 ? 0 : alpha;
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
};

/**
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns `{h: hue (0-1), s: saturation (0-1), v: value (0-1)}`
 */
export function RGBtoHSV(r: number, g: number, b: number): HSV {
  'worklet';
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  const v = max / 255;

  let h = 0;

  switch (max) {
    case min:
      break;
    case r:
      h = g - b + d * (g < b ? 6 : 0);
      h /= 6 * d;
      break;
    case g:
      h = b - r + d * 2;
      h /= 6 * d;
      break;
    case b:
      h = r - g + d * 4;
      h /= 6 * d;
      break;
  }

  return { h, s, v };
}

/**
 * @param h - Hue (0-1)
 * @param s - Saturation (0-1)
 * @param v - Value (0-1)
 * @returns `{r: red (0-255), g: green (0-255), b: blue (0-255)}`
 */
function HSVtoRGB(h: number, s: number, v: number): RGB {
  'worklet';
  let r, g, b;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch ((i % 6) as 0 | 1 | 2 | 3 | 4 | 5) {
    case 0:
      [r, g, b] = [v, t, p];
      break;
    case 1:
      [r, g, b] = [q, v, p];
      break;
    case 2:
      [r, g, b] = [p, v, t];
      break;
    case 3:
      [r, g, b] = [p, q, v];
      break;
    case 4:
      [r, g, b] = [t, p, v];
      break;
    case 5:
      [r, g, b] = [v, p, q];
      break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export const hsvToColor = (
  h: number,
  s: number,
  v: number,
  a: number
): number | string => {
  'worklet';
  const { r, g, b } = HSVtoRGB(h, s, v);
  return rgbaColor(r, g, b, a);
};

function processColorInitially(color: unknown): number | null | undefined {
  'worklet';
  if (color === null || color === undefined || typeof color === 'number') {
    return color;
  }

  let normalizedColor = normalizeColor(color);

  if (normalizedColor === null || normalizedColor === undefined) {
    return undefined;
  }

  if (typeof normalizedColor !== 'number') {
    return null;
  }

  normalizedColor = ((normalizedColor << 24) | (normalizedColor >>> 8)) >>> 0; // alpha rgb
  return normalizedColor;
}

export function isColor(value: unknown): boolean {
  'worklet';
  if (typeof value !== 'string') {
    return false;
  }
  return processColorInitially(value) != null;
}

const IS_ANDROID = isAndroid();

export function processColor(color: unknown): number | null | undefined {
  'worklet';
  let normalizedColor = processColorInitially(color);
  if (normalizedColor === null || normalizedColor === undefined) {
    return undefined;
  }

  if (typeof normalizedColor !== 'number') {
    return null;
  }

  if (IS_ANDROID) {
    // Android use 32 bit *signed* integer to represent the color
    // We utilize the fact that bitwise operations in JS also operates on
    // signed 32 bit integers, so that we can use those to convert from
    // *unsigned* to *signed* 32bit int that way.
    normalizedColor = normalizedColor | 0x0;
  }

  return normalizedColor;
}

export function processColorsInProps(props: StyleProps) {
  'worklet';
  for (const key in props) {
    if (ColorProperties.includes(key)) {
      props[key] = processColor(props[key]);
    }
  }
}

export type ParsedColorArray = [number, number, number, number];

export function convertToRGBA(color: unknown): ParsedColorArray {
  'worklet';
  const processedColor = processColorInitially(color)!; // alpha rgb;
  const a = (processedColor >>> 24) / 255;
  const r = ((processedColor << 8) >>> 24) / 255;
  const g = ((processedColor << 16) >>> 24) / 255;
  const b = ((processedColor << 24) >>> 24) / 255;
  return [r, g, b, a];
}

export function rgbaArrayToRGBAColor(RGBA: ParsedColorArray): string {
  'worklet';
  const alpha = RGBA[3] < 0.001 ? 0 : RGBA[3];
  return `rgba(${Math.round(RGBA[0] * 255)}, ${Math.round(
    RGBA[1] * 255
  )}, ${Math.round(RGBA[2] * 255)}, ${alpha})`;
}

export function toLinearSpace(
  RGBA: ParsedColorArray,
  gamma = 2.2
): ParsedColorArray {
  'worklet';
  const res = [];
  for (let i = 0; i < 3; ++i) {
    res.push(Math.pow(RGBA[i], gamma));
  }
  res.push(RGBA[3]);
  return res as ParsedColorArray;
}

export function toGammaSpace(
  RGBA: ParsedColorArray,
  gamma = 2.2
): ParsedColorArray {
  'worklet';
  const res = [];
  for (let i = 0; i < 3; ++i) {
    res.push(Math.pow(RGBA[i], 1 / gamma));
  }
  res.push(RGBA[3]);
  return res as ParsedColorArray;
}
