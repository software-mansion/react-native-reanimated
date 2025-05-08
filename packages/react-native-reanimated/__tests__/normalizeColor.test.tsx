import { normalizeColor } from '../src/Colors';

describe('Test `normalizeColor` function', () => {
  describe('Only compliant color are accepted', () => {
    test('test invalid colors', () => {
      [
        null,
        undefined,
        [12, 34, 56],
        { r: 12, g: 55, b: 156 },
        0x01234567 + 0.5,
        -1,
        0xffffffff + 1,
        '#00gg00',
        'rgb(1, 2, 3,)',
        'rgb(1, 2, 3',
      ].forEach((color) => {
        expect(normalizeColor(color)).toBe(null);
      });
    });

    test('test invalid colors (format was previously accepted)', () => {
      [
        'abc',
        ' #abc ',
        '##abc',
        'rgb 255 0 0',
        'RGBA(0, 1, 2)',
        'rgb (0, 1, 2)',
        'rgba(0 0 0 0.0)',
        'hsv(0, 1, 2)',
        { r: 10, g: 10, b: 10 },
        'hsl(1%, 2, 3)',
        'rg b( 1%, 2%, 3%)',
      ].forEach((color) => {
        expect(normalizeColor(color)).toBe(null);
      });
    });

    test('test valid colors', () => {
      [
        '#abc',
        '#abcd',
        '#abcdef',
        '#abcdef01',
        'rgb(1,2,3)',
        'rgb(100 200 3)',
        'rgb(1, 2, 3)',
        'rgb(   1   , 2   , 3   )',
        'rgb(-1, -2, -3)',
        'rgba(0, 0, 0, 1)',
      ].forEach((color) => {
        expect(normalizeColor(color)).not.toBe(null);
      });
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
    ])('normalizeColor("%s") = %p', (color, expectedColor) => {
      expect(normalizeColor(color)).toBe(expectedColor);
    });
  });

  describe('Test colors being a hex string', () => {
    describe('Test hex3', () => {
      test.each([
        ['#123', 0x112233ff],
        ['#abc', 0xaabbccff],
        ['#ABC', 0xaabbccff],
        ['#AbC', 0xaabbccff],
        ['#000', 0x000000ff],
        ['#fff', 0xffffffff],
        ['#f0f', 0xff00ffff],
      ])('normalizeColor(%s) = %p', (color, expectedColor) => {
        expect(normalizeColor(color)).toBe(expectedColor);
      });
    });

    describe('Test hex4', () => {
      test.each([
        ['#1234', 0x11223344],
        ['#abcd', 0xaabbccdd],
        ['#ABCD', 0xaabbccdd],
        ['#AbcD', 0xaabbccdd],
      ])('normalizeColor(%s) = %p', (color, expectedColor) => {
        expect(normalizeColor(color)).toBe(expectedColor);
      });
    });

    describe('Test hex6', () => {
      test.each([
        ['#000000', 0x000000ff],
        ['#ffffff', 0xffffffff],
        ['#ff00ff', 0xff00ffff],
        ['#abcdef', 0xabcdefff],
        ['#012345', 0x012345ff],
        ['#123456', 0x123456ff],
        ['#abcdef', 0xabcdefff],
        ['#ABCDEF', 0xabcdefff],
        ['#AbCdEf', 0xabcdefff],
      ])('normalizeColor(%s) = %p', (color, expectedColor) => {
        expect(normalizeColor(color)).toBe(expectedColor);
      });
    });

    describe('Test hex8', () => {
      test.each([
        ['#00000000', 0x00000000],
        ['#ffffffff', 0xffffffff],
        ['#ffff00ff', 0xffff00ff],
        ['#abcdef01', 0xabcdef01],
        ['#01234567', 0x01234567],
        ['#12345678', 0x12345678],
        ['#abcdefff', 0xabcdefff],
        ['#ABCDEFFF', 0xabcdefff],
        ['#AbcDEfFF', 0xabcdefff],
      ])('normalizeColor(%s) = %p', (color, expectedColor) => {
        expect(normalizeColor(color)).toBe(expectedColor);
      });
    });

    describe('Test invalid hex', () => {
      test.each([
        ['#12345', null],
        ['#12345g', null],
        ['#1234567', null],
        ['#abcde', null],
        ['#abcdeff', null],
        ['#abcde', null],
        ['#abcdeff', null],
        ['#abcde', null],
        ['#abcdeff', null],
      ])('normalizeColor(%s) = %p', (color, expectedColor) => {
        expect(normalizeColor(color)).toBe(expectedColor);
      });
    });
  });
  describe('Test colors being a rgb string', () => {
    test.each([
      ['rgb (0,0,0)', null],
      ['rgb(50,200,150, 45)', null],
      ['RGB(50,200,150)', null],
      ['rgb(50,200,150, 0.45)', null],
      ['rgb(0, 0, 255)', 0x0000ffff],
      ['rgb(0 0 255)', 0x0000ffff],
      ['rgb(100, 15, 69)', 0x640f45ff],
      ['rgb(255, 255, 255)', 0xffffffff],
      ['rgb(256, 256, 256)', 0xffffffff],
      ['rgb(-1, -2, -3)', 0x000000ff],
      ['rgb(0, 0, 0)', 0x000000ff],
      ['rgb(0  0  0)', 0x000000ff],
      ['rgb(0,0,0)', 0x000000ff],
      ['rgb(0 ,0 ,0 )', 0x000000ff],
      ['rgb( 0,0,0 )', 0x000000ff],
      ['rgb(101,255,50)', 0x65ff32ff],
      ['rgb(100.99999,255,50)', 0x64ff32ff],
      ['rgb(100.75,255,50)', 0x64ff32ff],
      ['rgb(100.5,255,50)', 0x64ff32ff],
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
      ['rgba(0, 0, 0, .5)', 0x00000080],
      ['rgba(0, 0, 0, 0.0)', 0x00000000],
      ['rgba(0, 0, 0, 0)', 0x00000000],
      ['rgba(0, 0, 0, -0.5)', 0x00000000],
      ['rgba(0, 0, 0, 1.0)', 0x000000ff],
      ['rgba(0, 0, 0, 1)', 0x000000ff],
      ['rgba(0, 0, 0, 1.5)', 0x000000ff],
      ['rgba(0  0  0 / 0.0)', 0x00000000],
      ['rgba(0 0 0 / 1)', 0x000000ff],
      ['rgba(100, 15, 69, 0.5)', 0x640f4580],
      ['rgba(100 15 69 / 0.5)', 0x640f4580],
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
      ['hsl(0, 0%, 0%)', 0x000000ff],
      ['hsl(360, 100%, 100%)', 0xffffffff],
      ['hsl(180, 50%, 50%)', 0x40bfbfff],
      ['hsl(540, 50%, 50%)', 0x40bfbfff],
      ['hsl(70, 25%, 75%)', 0xcacfafff],
      ['hsl(70, 100%, 75%)', 0xeaff80ff],
      ['hsl(70, 110%, 75%)', 0xeaff80ff],
      ['hsl(70, 0%, 75%)', 0xbfbfbfff],
      ['hsl(70, -10%, 75%)', 0xbfbfbfff],
      ['hsl(0 0% 0%)', 0x000000ff],
      ['hsl(360 100% 100%)', 0xffffffff],
      ['hsl(180 50% 50%)', 0x40bfbfff],
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
      ['hsla(0, 0%, 0%, 0)', 0x00000000],
      ['hsla(360, 100%, 100%, 1)', 0xffffffff],
      ['hsla(360, 100%, 100%, 0)', 0xffffff00],
      ['hsla(180, 50%, 50%, 0.2)', 0x40bfbf33],
      ['hsla(0 0% 0% / 0)', 0x00000000],
      ['hsla(360 100% 100% / 1)', 0xffffffff],
      ['hsla(360 100% 100% / 0)', 0xffffff00],
      ['hsla(180 50% 50% / 0.2)', 0x40bfbf33],
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
      ['hwb(0, 0%, 100%)', 0x000000ff],
      ['hwb(0, 100%, 0%)', 0xffffffff],
      ['hwb(0, 0%, 0%)', 0xff0000ff],
      ['hwb(70, 50%, 0%)', 0xeaff80ff],
      ['hwb(0, 50%, 50%)', 0x808080ff],
      ['hwb(360, 100%, 100%)', 0x808080ff],
      ['hwb(0 0% 0%)', 0xff0000ff],
      ['hwb(70 50% 0%)', 0xeaff80ff],
      ['HWB(0,100%,50%)', null],
      ['hwb(0,67%, 33%)', 0xabababff],
      ['hwb(0,67% , 33%)', 0xabababff],
      ['hwb(48, 38%, 6%)', 0xf0d361ff],
    ])('normalizeColor(%s) = %p', (color, expectedColor) => {
      expect(normalizeColor(color)).toBe(expectedColor);
    });
  });

  describe('Test colors a colorName string', () => {
    test.each([
      ['red', 0xff0000ff],
      ['transparent', 0x00000000],
      ['peachpuff', 0xffdab9ff],
      ['peachPuff', null],
      ['PeachPuff', null],
    ])('normalizeColor(%s) = %p', (color, expectedColor) => {
      expect(normalizeColor(color)).toBe(expectedColor);
    });
  });
});
