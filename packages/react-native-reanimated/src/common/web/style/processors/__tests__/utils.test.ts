'use strict';
import { parseDimensionValue } from '../../utils';

describe(parseDimensionValue, () => {
  test('returns undefined for object values', () => {
    expect(parseDimensionValue({} as never)).toBeUndefined();
  });

  test('returns string values unchanged', () => {
    expect(parseDimensionValue('10%')).toBe('10%');
  });

  test('appends px suffix for numbers', () => {
    expect(parseDimensionValue(4)).toBe('4px');
  });
});
