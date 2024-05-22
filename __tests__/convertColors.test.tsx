import { normalizeColor } from '../src/reanimated2/Colors';

describe('Test `normalizeColor` function', () => {
  describe('Test colors being an invalid type ', () => {
    test.each([
      [null, null],
      [undefined, null],
      [[12, 34, 56], null],
      [{ r: 12, g: 55, b: 156 }, null],
    ])('normalizeColor(%p) = null', (color, expectedColor) => {
      expect(normalizeColor(color)).toBe(expectedColor);
    });
  });

  describe('Test colors being a number ', () => {
    test.each([
      [0x1, 0x1],
      [0x12, 0x12],
      [0x123, 0x123],
      [0x1234, 0x1234],
      [0x12345, 0x12345],
      [0x123456, 0x123456],
      [0x1234567, 0x1234567],
      [0x12345678, 0x12345678],
      [0x123456789, null],
      [11, 11],
      [158, 158],
      [300.78, null],
      [-300, null],
      [0, 0],
      [NaN, null],
      [Infinity, null],
      [-Infinity, null],
    ])('normalizeColor(%d) = %p', (color, expectedColor) => {
      expect(normalizeColor(color)).toBe(expectedColor);
    });
  });

  describe('Test colors being a number as string', () => {
    test.each([
      ['0x1', null],
      ['0x12', null],
      ['0x123', null],
      ['0x1234', null],
      ['0x12345', null],
      ['0x123456', null],
      ['0x1234567', null],
      ['0x12345678', null],
      ['0x123456789', null],
      ['11', null],
      ['158', null],
      ['300.78', null],
      ['-300', null],
      ['0', null],
    ])('normalizeColor(%s) = %p', (color, expectedColor) => {
      expect(normalizeColor(color)).toBe(expectedColor);
    });
  });

  describe('Test colors being a hex string', () => {
    test.each([
      ['#123', 0x112233ff],
      ['#1234', 0x11223344],
      ['#12345', null],
      ['#123456', 0x123456ff],
      ['#1234567', null],
      ['#12345678', 0x12345678],
      ['#abc', 0xaabbccff],
      ['#abcd', 0xaabbccdd],
      ['#abcde', null],
      ['#abcdef', 0xabcdefff],
      ['#abcdeff', null],
      ['#abcdefff', 0xabcdefff],
      ['#abcdef32', 0xabcdef32],
      ['#ABC', 0xaabbccff],
      ['#ABCD', 0xaabbccdd],
      ['#abcde', null],
      ['#ABCDEF', 0xabcdefff],
      ['#abcdeff', null],
      ['#ABCDEFFF', 0xabcdefff],
      ['#AbC', 0xaabbccff],
      ['#AbcD', 0xaabbccdd],
      ['#abcde', null],
      ['#AbCdEf', 0xabcdefff],
      ['#abcdeff', null],
      ['#AbcDEfFF', 0xabcdefff],
    ])('normalizeColor(%s) = %p', (color, expectedColor) => {
      expect(normalizeColor(color)).toBe(expectedColor);
    });
  });
  describe('Test colors being a rgb string', () => {
    // HEX 65 = DEC 101
    // HEX 64 = DEC 100
    // HEX 63 = DEC 99

    test.each([
      ['rgb (0,0,0)', null],
      ['rgb(50,200,150, 45)', null],
      ['RGB(50,200,150)', null],
      ['rgb(50,200,150, 0.45)', null],

      ['rgb(0,0,0)', 0x000000ff],
      ['rgb(0 ,0 ,0 )', 0x000000ff],
      ['rgb( 0,0,0 )', 0x000000ff],
      ['rgb(101,255,50)', 0x65ff32ff],
      ['rgb(100.99999,255,50)', 0x64ff32ff], // Should be 0x65ff00ff
      ['rgb(100.75,255,50)', 0x64ff32ff], // Should be 0x65ff00ff
      ['rgb(100.5,255,50)', 0x64ff32ff], // Should be 0x65ff00ff
      ['rgb(100.25,255,50)', 0x64ff32ff],
      ['rgb(100,255,50)', 0x64ff32ff],
      ['rgb(99,255,50)', 0x63ff32ff],
    ])('normalizeColor(%s) = %p', (color, expectedColor) => {
      expect(normalizeColor(color)).toBe(expectedColor);
    });
  });

  describe('Test colors being a rgba string', () => {
    test.each([
      ['RGBA(100 ,255 ,50 ,50 )', null],
      ['rgba (100,255,50,.5)', null],
      ['    rgba(100,255,50,    50)', 0x64ff32ff],
      ['rgba(100 ,255 ,50 ,50 )', 0x64ff32ff],
      ['rgba(100,255,50,0.5)', 0x64ff3280],
      ['rgba(100,255,50,.5)', 0x64ff3280],
      ['rgba(50,50,50,.5)', 0x32323280],
      ['rgba(50,50,50,1)', 0x323232ff],
      ['rgba(50,50,50,0)', 0x32323200],
    ])('normalizeColor(%s) = %p', (color, expectedColor) => {
      expect(normalizeColor(color)).toBe(expectedColor);
    });
  });

  describe('Test colors being a hsl string', () => {
    test.each([
      ['HSL(0,100%,50%)', null],
      ['hsl(120 ,0.99, 0.1 )', null],
      ['hsl(0,100,50)', null],
      ['hsl(0,100%,50%, 0.5)', null],
      ['hsl(0,100%,50%)', 0xff0000ff],
      ['hsl(0,100%,50%)', 0xff0000ff],
      ['hsl(120,100%,50%)', 0x00ff00ff],
      ['hsl(120.5,100%,50%)', 0x00ff02ff],
      ['hsl(120.999,100%,50%)', 0x00ff04ff],
      ['hsl(120,50%,50%)', 0x40bf40ff],
      ['hsl(120 ,50%, 50% )', 0x40bf40ff],
      ['hsl(130 ,13.33%, 100% )', 0xffffffff],
    ])('normalizeColor(%s) = %p', (color, expectedColor) => {
      expect(normalizeColor(color)).toBe(expectedColor);
    });
  });

  describe('Test colors being a hsla string', () => {
    test.each([
      ['HSLA(0,100%,50%,0.5)', null],
      ['hsla(0,100%,50%,0.5)', 0xff000080],
      ['hsla(120,100%,50%, 0.5)', 0x00ff0080],
      ['hsla(120,100%,50%, 1)', 0x00ff00ff],
      ['hsla(120,100%,50%, 0)', 0x00ff0000],
      ['   hsla( 120 , 100% , 50%, 0.5 ) ', 0x00ff0080],
    ])('normalizeColor(%s) = %p', (color, expectedColor) => {
      expect(normalizeColor(color)).toBe(expectedColor);
    });
  });

  describe('Test colors being a hwb string', () => {
    test.each([
      ['HWB(0,100%,50%)', null],
      ['hwb(0,67%, 33%)', 0xabababff],
      ['hwb(0,67% , 33%)', 0xabababff],
      ['hwb(48, 38%, 6%)', 0xf0d361ff],
    ])('normalizeColor(%s) = %p', (color, expectedColor) => {
      expect(normalizeColor(color)).toBe(expectedColor);
    });
  });
});
