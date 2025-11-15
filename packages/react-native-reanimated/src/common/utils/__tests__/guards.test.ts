'use strict';
import {
  hasProp,
  isAngle,
  isConfigPropertyAlias,
  isDefined,
  isLength,
  isNumber,
  isNumberArray,
  isPercentage,
  isRecord,
} from '../guards';

describe(isDefined, () => {
  test.each([
    ['value', true],
    [0, true],
    [null, false],
    [undefined, false],
  ])('checks %p => %p', (input, expected) => {
    expect(isDefined(input)).toBe(expected);
  });
});

describe(isAngle, () => {
  test.each([
    ['45deg', true],
    ['3.14rad', true],
    ['10', false],
    [45, false],
  ])('checks %p => %p', (input, expected) => {
    expect(isAngle(input)).toBe(expected);
  });
});

describe(isNumber, () => {
  test.each([
    [10, true],
    [0, true],
    [NaN, false],
    ['10', false],
  ])('checks %p => %p', (input, expected) => {
    expect(isNumber(input)).toBe(expected);
  });
});

describe(isNumberArray, () => {
  test.each([
    [[1, 2, 3], true],
    [[], true],
    [[1, '2'], false],
    ['not array', false],
  ])('checks %p => %p', (input, expected) => {
    expect(isNumberArray(input)).toBe(expected);
  });
});

describe(isLength, () => {
  test.each([
    ['10px', true],
    ['20', true],
    ['10%', false],
  ])('checks %p => %p', (input, expected) => {
    expect(isLength(input)).toBe(expected);
  });
});

describe(isPercentage, () => {
  test.each([
    ['10%', true],
    ['-5%', true],
    ['10', false],
    [10, false],
  ])('checks %p => %p', (input, expected) => {
    expect(isPercentage(input)).toBe(expected);
  });
});

describe(isRecord, () => {
  test.each([
    [{ width: 10 }, true],
    [null, false],
    [[1, 2], false],
    ['value', false],
  ])('checks %p => %p', (input, expected) => {
    expect(isRecord(input)).toBe(expected);
  });
});

describe(hasProp, () => {
  test('returns true for existing prop', () => {
    const obj = { value: 'present' };
    expect(hasProp(obj, 'value')).toBe(true);
  });

  test('returns false for missing prop', () => {
    const obj = { value: 'present' };
    expect(hasProp(obj, 'missing')).toBe(false);
  });
});

describe(isConfigPropertyAlias, () => {
  test.each([
    [{ as: 'width' }, true],
    [{}, false],
    [null, false],
    ['string', false],
  ])('checks %p => %p', (input, expected) => {
    expect(isConfigPropertyAlias<Record<string, unknown>>(input)).toBe(
      expected
    );
  });
});
