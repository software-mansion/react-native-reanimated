'use strict';
import { hasSuffix, maybeAddSuffix } from '../suffix';

describe(hasSuffix, () => {
  test.each([
    ['10px', true],
    ['1.5em', true],
    ['100', false],
    [42, false],
  ])('for %p returns %p', (input, expected) => {
    expect(hasSuffix(input)).toBe(expected);
  });
});

describe(maybeAddSuffix, () => {
  test('returns the same value when it has a suffix', () => {
    expect(maybeAddSuffix('5px', 'px')).toBe('5px');
  });

  test('adds suffix when missing', () => {
    expect(maybeAddSuffix(5, 'px')).toBe('5px');
  });
});
