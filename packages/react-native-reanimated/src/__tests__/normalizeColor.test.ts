'use strict';

import { normalizeColor } from '../Colors';

describe('normalizeColor', () => {
  // Values match what trying every matcher in order returns: `normalizeColor`
  // runs a single matcher first for some spellings, and these cases pin both
  // that path and the fallback for strings it doesn't take, such as leading
  // whitespace or a second color after the first one.
  it.each([
    ['red', 0xff0000ff],
    ['transparent', 0x00000000],
    ['constructor', null],
    ['toString', null],
    ['__proto__', null],
    ['hasOwnProperty', null],
    ['#3f8a2c', 0x3f8a2cff],
    ['#3f8a2c80', 0x3f8a2c80],
    ['#3f8', 0x33ff88ff],
    ['#3f88', 0x33ff8888],
    ['#3f8a2', null],
    ['#xyz', null],
    ['#3F8A2C80', 0x3f8a2c80],
    ['rgb(255, 128, 0)', 0xff8000ff],
    ['rgb(255 128 0)', 0xff8000ff],
    ['rgba(10, 20, 30, 0.5)', 0x0a141e80],
    ['rgba(10 20 30 / 0.5)', 0x0a141e80],
    ['rgba(10, 20, 30)', null],
    ['hsl(120, 100%, 50%)', 0x00ff00ff],
    ['hsl(213.37,100%,50%)', 0x0071ffff],
    ['hsl(120 100% 50%)', 0x00ff00ff],
    ['hsl(-30, 100%, 50%)', 0xff0080ff],
    ['hsl(120, 150%, 50%)', 0x00ff00ff],
    ['hsl(120, 100, 50)', null],
    ['hsla(200, 80%, 40%, 0.3)', 0x1481b84d],
    ['hsla(200 80% 40% / 0.3)', 0x1481b84d],
    ['hsla(200, 80%, 40%, 2)', 0x1481b8ff],
    ['hsla(200, 80%, 40%)', null],
    ['hwb(120 10% 20%)', 0x1acc1aff],
    ['hwb(120, 10%, 20%)', 0x1acc1aff],
    ['hwb(120 10 20)', null],
    [' hsl(120, 100%, 50%)', 0x00ff00ff],
    ['hsl(120, 100%, 50%) ', 0x00ff00ff],
    ['hsl(120, 100%, 50%)x', 0x00ff00ff],
    ['hsl(120,100%,50%)rgb(1, 2, 3)', 0x010203ff],
    ['hsla(1,2%,3%,0.5)rgb(4,5,6)', 0x040506ff],
    ['hwb(120 10% 20%)rgb(1,2,3)', 0x010203ff],
    ['HSL(120, 100%, 50%)', null],
    ['h', null],
    ['#', null],
    ['', null],
  ])('%j', (color, expected) => {
    expect(normalizeColor(color)).toBe(expected);
  });
});
