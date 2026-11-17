'use strict';
import { processFontVariant, processFontWeight } from '../font';

describe(processFontWeight, () => {
  test.each([
    [400, '400'],
    ['400', '400'],
    ['bold', '700'],
  ])('normalizes %p to %p', (input, expected) => {
    expect(processFontWeight(input)).toBe(expected);
  });

  test.each(['unknown', 'toString'])(
    'returns undefined for unsupported value %s',
    (value) => {
      expect(processFontWeight(value)).toBeUndefined();
    }
  );
});

describe(processFontVariant, () => {
  test('joins array values into comma separated string', () => {
    expect(processFontVariant(['small-caps', 'lining-nums'])).toBe(
      'small-caps, lining-nums'
    );
  });
});
