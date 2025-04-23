'use strict';
import { parseBoxShadowString } from '../../../common';

describe(parseBoxShadowString, () => {
  describe('correct number of shadows', () => {
    it('works with empty string', () => {
      expect(parseBoxShadowString('')).toHaveLength(0);
    });

    it('works with one shadow', () => {
      expect(
        parseBoxShadowString('0 0 10px 0 rgba(0, 0, 0, 0.5)')
      ).toHaveLength(1);
    });

    it('works with multiple shadows', () => {
      expect(
        parseBoxShadowString(
          '0 0 10px 0 rgba(0, 0, 0, 0.5), 0 0 20px 0 rgba(0, 0, 0, 0.5)'
        )
      ).toHaveLength(2);
    });
  });

  describe('proper shadow values', () => {
    it.each([
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
    it.each([
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
