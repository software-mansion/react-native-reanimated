'use strict';
import { parseBoxShadowString } from '../../../common';
import type { TimeUnit } from '../../types';
import { normalizeTimeUnit } from '../parsers';

describe(parseBoxShadowString, () => {
  describe('correct number of shadows', () => {
    test('works with empty string', () => {
      expect(parseBoxShadowString('')).toHaveLength(0);
    });

    test('works with one shadow', () => {
      expect(
        parseBoxShadowString('0 0 10px 0 rgba(0, 0, 0, 0.5)')
      ).toHaveLength(1);
    });

    test('works with multiple shadows', () => {
      expect(
        parseBoxShadowString(
          '0 0 10px 0 rgba(0, 0, 0, 0.5), 0 0 20px 0 rgba(0, 0, 0, 0.5)'
        )
      ).toHaveLength(2);
    });
  });

  describe('proper shadow values', () => {
    test.each([
      [
        '0 0 10px 0 red',
        [
          {
            offsetX: '0',
            offsetY: '0',
            blurRadius: '10px',
            spreadDistance: '0',
            color: 'red',
          },
        ],
      ],
      [
        'blue 0 0 10px 0 inset',
        [
          {
            offsetX: '0',
            offsetY: '0',
            blurRadius: '10px',
            spreadDistance: '0',
            color: 'blue',
            inset: true,
          },
        ],
      ],
      [
        '20px 20px 10px 0 red, 0 10px 20px 30px blue',
        [
          {
            offsetX: '20px',
            offsetY: '20px',
            blurRadius: '10px',
            spreadDistance: '0',
            color: 'red',
          },
          {
            offsetX: '0',
            offsetY: '10px',
            blurRadius: '20px',
            spreadDistance: '30px',
            color: 'blue',
          },
        ],
      ],
    ])('works with %s', (value, expected) => {
      expect(parseBoxShadowString(value)).toEqual(expected);
    });
  });

  describe('different color formats', () => {
    test.each([
      'red',
      '#ff0000',
      'rgb(255, 0, 0)',
      'rgba(255, 0, 0, 0.5)',
      'hsl(0, 100%, 50%)',
      'hsla(0, 100%, 50%, 0.5)',
    ])('works with %s', (value) => {
      expect(parseBoxShadowString(`0 0 10px 0 ${value}`)).toEqual([
        {
          offsetX: '0',
          offsetY: '0',
          blurRadius: '10px',
          spreadDistance: '0',
          color: value,
        },
      ]);
    });
  });
});

describe(normalizeTimeUnit, () => {
  test.each([0, 100, -100, 0.5])(
    'passes the finite number %p through',
    (value) => {
      expect(normalizeTimeUnit(value)).toBe(value);
    }
  );

  test.each([
    ['100ms', 100],
    ['0ms', 0],
    ['-100ms', -100],
    ['0.5ms', 0.5],
    ['1.5ms', 1.5],
    ['.5ms', 0.5],
    ['-1.5ms', -1.5],
    ['1s', 1000],
    ['0.1s', 100],
    ['0.0005s', 0.5],
    ['.5s', 500],
    ['-1s', -1000],
  ] satisfies [TimeUnit, number][])('converts %p to %p', (value, expected) => {
    expect(normalizeTimeUnit(value)).toBe(expected);
  });

  test('keeps the precision of a computed frame duration', () => {
    const frameDuration = 1000 / 60;
    expect(normalizeTimeUnit(`${frameDuration}ms`)).toBe(frameDuration);
  });

  // A non-finite value reaching native makes every progress computed from it
  // NaN, so it has to be rejected here where it can still be reported.
  test.each([NaN, Infinity, -Infinity])('rejects %p', (value) => {
    expect(normalizeTimeUnit(value)).toBeNull();
  });

  test.each(['invalid', 'mss', '100mms', '1', '1.1', ''])(
    'rejects %p',
    (value) => {
      expect(normalizeTimeUnit(value as TimeUnit)).toBeNull();
    }
  );
});
