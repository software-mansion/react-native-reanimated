'use strict';
import { processColor } from '../colors';

describe(processColor, () => {
  test('normalizes hwb spacing', () => {
    expect(processColor('hwb(0, 0%, 0%)')).toBe('hwb(0 0% 0%)');
  });

  test('returns original string for other formats', () => {
    expect(processColor('#123456')).toBe('#123456');
  });
});
