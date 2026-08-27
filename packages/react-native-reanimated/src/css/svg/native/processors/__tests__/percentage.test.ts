'use strict';

import { processPercentage } from '../percentage';

describe(processPercentage, () => {
  test.each([
    ['50%', 0.5],
    ['0%', 0],
    ['100%', 1],
    ['12.5%', 0.125],
  ])('converts %s to %p', (input, expected) => {
    expect(processPercentage(input)).toBe(expected);
  });

  test.each([' 50%', '50% ', ' 50% ', '\n50%\t'])(
    'ignores the whitespace padding %j',
    (input) => {
      expect(processPercentage(input)).toBe(0.5);
    }
  );

  test.each([
    [0.25, 0.25],
    ['0.25', 0.25],
    [' 0.25 ', 0.25],
  ])('passes %p through as a plain number', (input, expected) => {
    expect(processPercentage(input)).toBe(expected);
  });

  test.each([
    ['150%', 1],
    [2, 1],
    ['-10%', 0],
    [-1, 0],
    ['nonsense', 1],
  ])('clamps %p to %p', (input, expected) => {
    expect(processPercentage(input)).toBe(expected);
  });
});
