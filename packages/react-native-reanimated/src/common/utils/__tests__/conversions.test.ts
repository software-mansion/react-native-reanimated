'use strict';
import {
  camelizeKebabCase,
  convertPropertiesToArrays,
  convertPropertyToArray,
  kebabizeCamelCase,
} from '../conversions';

describe(convertPropertyToArray, () => {
  test('returns empty array for undefined input', () => {
    expect(convertPropertyToArray(undefined)).toEqual([]);
  });

  test('wraps scalar values in an array', () => {
    expect(convertPropertyToArray(0)).toEqual([0]);
  });

  test('returns the same array instance', () => {
    const values = ['a', 'b'];
    expect(convertPropertyToArray(values)).toBe(values);
  });
});

describe(convertPropertiesToArrays, () => {
  test('converts each property and keeps keys', () => {
    const input = {
      width: 10,
      padding: [5, 10],
      margin: undefined,
    };

    expect(convertPropertiesToArrays(input)).toEqual({
      width: [10],
      padding: [5, 10],
      margin: [],
    });
  });
});

describe(kebabizeCamelCase, () => {
  test.each([
    ['borderRadius', 'border-radius'],
    ['fontWeight', 'font-weight'],
    ['gap', 'gap'],
  ])('converts %p to %p', (input, expected) => {
    expect(kebabizeCamelCase(input)).toBe(expected);
  });
});

describe(camelizeKebabCase, () => {
  test.each([
    ['border-radius', 'borderRadius'],
    ['font-weight', 'fontWeight'],
    ['gap', 'gap'],
  ])('converts %p to %p', (input, expected) => {
    expect(camelizeKebabCase(input)).toBe(expected);
  });
});
