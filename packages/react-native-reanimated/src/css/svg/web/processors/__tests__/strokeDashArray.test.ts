'use strict';
import { processStrokeDashArray } from '../strokeDashArray';

describe(processStrokeDashArray, () => {
  test('adds px to a numeric scalar', () => {
    expect(processStrokeDashArray(10)).toBe('10px');
  });

  test('keeps an existing percentage unit', () => {
    expect(processStrokeDashArray('10%')).toBe('10%');
  });

  test('applies the unit per element for a numeric array', () => {
    expect(processStrokeDashArray([10, 20, 30])).toBe('10px 20px 30px');
  });

  test('keeps percentages in an array', () => {
    expect(processStrokeDashArray(['10%', '5%'])).toBe('10% 5%');
  });

  test('handles a mixed array', () => {
    expect(processStrokeDashArray([8, '15%'])).toBe('8px 15%');
  });
});
