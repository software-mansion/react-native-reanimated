'use strict';
import { normalizeIterationCount } from '../settings';

describe(normalizeIterationCount, () => {
  test('converts Infinity to "infinite"', () => {
    expect(normalizeIterationCount(Infinity)).toBe('infinite');
  });

  test('converts "infinite" string to "infinite"', () => {
    expect(normalizeIterationCount('infinite')).toBe('infinite');
  });

  test('converts regular numbers to strings', () => {
    expect(normalizeIterationCount(0)).toBe('0');
    expect(normalizeIterationCount(1)).toBe('1');
    expect(normalizeIterationCount(42)).toBe('42');
    expect(normalizeIterationCount(3.5)).toBe('3.5');
  });
});
