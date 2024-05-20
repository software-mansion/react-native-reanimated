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
});
