'use strict';
import type { BoxShadowValue } from 'react-native';

import { processColor } from '../colors';
import type { ProcessedBoxShadowValue } from '../shadows';
import { processBoxShadow } from '../shadows';

describe(processBoxShadow, () => {
  describe('returns a correct number of shadows', () => {
    describe('when input is a string', () => {
      it('returns undefined when input is "none"', () => {
        expect(processBoxShadow('none')).toBeUndefined();
      });

      it.each([
        ['', 0],
        [',,', 0], // only commas
        ['0 0 10px 0 red', 1],
        ['0 0 10px 0 red, 0 0 20px 0 blue', 2],
      ])('returns a correct number of shadows', (input, expected) => {
        expect(processBoxShadow(input)).toHaveLength(expected);
      });
    });

    describe('when input is an array of objects', () => {
      it.each([
        [[], 0],
        [[{ offsetX: 0, offsetY: 0 }], 1],
        [
          [
            { offsetX: 0, offsetY: 0 },
            { offsetX: 0, offsetY: 0 },
          ],
          2,
        ],
      ] satisfies [BoxShadowValue[], number][])(
        'returns a correct number of shadows',
        (input, expected) => {
          expect(processBoxShadow(input)).toHaveLength(expected);
        }
      );
    });
  });

  describe('returns correct shadow values', () => {
    describe('when input is a string', () => {
      it('provides proper default values', () => {
        expect(processBoxShadow('0 0')).toEqual([
          {
            offsetX: 0,
            offsetY: 0,
            blurRadius: 0,
            spreadDistance: 0,
            color: processColor('#000')!,
          },
        ]);
      });

      it.each([
        [
          '0 0 10px 0',
          [
            {
              offsetX: 0,
              offsetY: 0,
              blurRadius: 10,
              spreadDistance: 0,
              color: processColor('#000')!,
            },
          ],
        ],
        [
          '10px 20px blue 30px 40px inset',
          [
            {
              offsetX: 10,
              offsetY: 20,
              blurRadius: 30,
              spreadDistance: 40,
              color: processColor('blue')!,
              inset: true,
            },
          ],
        ],
      ] satisfies [string | BoxShadowValue[], ProcessedBoxShadowValue[]][])(
        'for input %s returns %s',
        (input, expected) => {
          expect(processBoxShadow(input)).toEqual(expected);
        }
      );
    });

    describe('when input is an array of objects', () => {
      it.each([
        [
          [{ offsetX: 0, offsetY: 0, blurRadius: 10, color: 'red' }],
          [
            {
              offsetX: 0,
              offsetY: 0,
              blurRadius: 10,
              spreadDistance: 0,
              color: processColor('red')!,
            },
          ],
        ],
        [
          [
            { offsetX: 10, offsetY: 20 },
            {
              offsetX: '10px',
              offsetY: '20px',
              blurRadius: '30px',
              spreadDistance: '40px',
              color: 'red',
              inset: true,
            },
          ],
          [
            {
              offsetX: 10,
              offsetY: 20,
              blurRadius: 0,
              spreadDistance: 0,
              color: processColor('#000')!,
            },
            {
              offsetX: 10,
              offsetY: 20,
              blurRadius: 30,
              spreadDistance: 40,
              color: processColor('red')!,
              inset: true,
            },
          ],
        ],
      ] satisfies [BoxShadowValue[], ProcessedBoxShadowValue[]][])(
        'returns a correct number of shadows',
        (input, expected) => {
          expect(processBoxShadow(input)).toEqual(expected);
        }
      );
    });
  });
});
