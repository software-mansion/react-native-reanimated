'use strict';
import { ReanimatedError } from '../../../../../errors';
import type { TransformsArray } from '../../../../../types';
import { ERROR_MESSAGES, processTransform } from '../transform';

describe(processTransform, () => {
  it('returns the same object if not a string', () => {
    expect(processTransform([{ translateX: 25 }])).toEqual([
      { translateX: 25 },
    ]);
  });

  describe('converts transform string to transform objects', () => {
    const cases: {
      name: string;
      cases: { input: string; output: TransformsArray }[];
    }[] = [
      {
        name: 'translate',
        cases: [
          {
            input: 'translate(25, 25)',
            output: [{ translateX: 25 }, { translateY: 25 }],
          },
          {
            input: 'translate(25%, 25%)',
            output: [{ translateX: '25%' }, { translateY: '25%' }],
          },
          {
            input: 'translate(25, 25%)',
            output: [{ translateX: 25 }, { translateY: '25%' }],
          },
          {
            input: 'translate(25%, 25)',
            output: [{ translateX: '25%' }, { translateY: 25 }],
          },
          {
            input: 'translate(25)',
            output: [{ translateX: 25 }, { translateY: 25 }],
          },
          {
            input: 'translate(25%)',
            output: [{ translateX: '25%' }, { translateY: '25%' }],
          },
        ],
      },
      {
        name: 'translateX',
        cases: [
          {
            input: 'translateX(25)',
            output: [{ translateX: 25 }],
          },
          {
            input: 'translateX(25%)',
            output: [{ translateX: '25%' }],
          },
        ],
      },
      {
        name: 'translateY',
        cases: [
          {
            input: 'translateY(25)',
            output: [{ translateY: 25 }],
          },
          {
            input: 'translateY(25%)',
            output: [{ translateY: '25%' }],
          },
        ],
      },
      {
        name: 'scale',
        cases: [
          {
            input: 'scale(2)',
            output: [{ scale: 2 }],
          },
          {
            input: 'scale(2, 3)',
            output: [{ scaleX: 2 }, { scaleY: 3 }],
          },
        ],
      },
      {
        name: 'scaleX',
        cases: [
          {
            input: 'scaleX(2)',
            output: [{ scaleX: 2 }],
          },
        ],
      },
      {
        name: 'scaleY',
        cases: [
          {
            input: 'scaleY(2)',
            output: [{ scaleY: 2 }],
          },
        ],
      },
      {
        name: 'rotate',
        cases: [
          {
            input: 'rotate(90deg)',
            output: [{ rotate: '90deg' }],
          },
          {
            input: 'rotate(1.5rad)',
            output: [{ rotate: '1.5rad' }],
          },
          {
            input: 'rotate(0)',
            output: [{ rotate: '0deg' }],
          },
        ],
      },
      {
        name: 'rotateX',
        cases: [
          {
            input: 'rotateX(90deg)',
            output: [{ rotateX: '90deg' }],
          },
          {
            input: 'rotateX(1.5rad)',
            output: [{ rotateX: '1.5rad' }],
          },
          {
            input: 'rotateX(0)',
            output: [{ rotateX: '0deg' }],
          },
        ],
      },
      {
        name: 'rotateY',
        cases: [
          {
            input: 'rotateY(90deg)',
            output: [{ rotateY: '90deg' }],
          },
          {
            input: 'rotateY(1.5rad)',
            output: [{ rotateY: '1.5rad' }],
          },
          {
            input: 'rotateY(0)',
            output: [{ rotateY: '0deg' }],
          },
        ],
      },
      {
        name: 'rotateZ',
        cases: [
          {
            input: 'rotateZ(90deg)',
            output: [{ rotateZ: '90deg' }],
          },
          {
            input: 'rotateZ(1.5rad)',
            output: [{ rotateZ: '1.5rad' }],
          },
          {
            input: 'rotateZ(0)',
            output: [{ rotateZ: '0deg' }],
          },
        ],
      },
      {
        name: 'skew',
        cases: [
          {
            input: 'skew(45deg)',
            output: [{ skewX: '45deg' }, { skewY: '45deg' }],
          },
          {
            input: 'skew(0)',
            output: [{ skewX: '0deg' }, { skewY: '0deg' }],
          },
          {
            input: 'skew(45deg, 45deg)',
            output: [{ skewX: '45deg' }, { skewY: '45deg' }],
          },
          {
            input: 'skew(1.5rad, 1.5rad)',
            output: [{ skewX: '1.5rad' }, { skewY: '1.5rad' }],
          },
          {
            input: 'skew(0, 0)',
            output: [{ skewX: '0deg' }, { skewY: '0deg' }],
          },
        ],
      },
      {
        name: 'skewX',
        cases: [
          {
            input: 'skewX(45deg)',
            output: [{ skewX: '45deg' }],
          },
          {
            input: 'skewX(1.5rad)',
            output: [{ skewX: '1.5rad' }],
          },
          {
            input: 'skewX(0)',
            output: [{ skewX: '0deg' }],
          },
        ],
      },
      {
        name: 'skewY',
        cases: [
          {
            input: 'skewY(45deg)',
            output: [{ skewY: '45deg' }],
          },
          {
            input: 'skewY(1.5rad)',
            output: [{ skewY: '1.5rad' }],
          },
          {
            input: 'skewY(0)',
            output: [{ skewY: '0deg' }],
          },
        ],
      },
      {
        name: 'matrix',
        cases: [
          {
            input: 'matrix(1, 2, 3, 4, 5, 6)',
            output: [
              { matrix: [1, 2, 0, 0, 3, 4, 0, 0, 0, 0, 1, 0, 5, 6, 0, 1] },
            ],
          },
          {
            input:
              'matrix(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)',
            output: [
              {
                matrix: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
              },
            ],
          },
        ],
      },
    ];

    describe.each(cases)('$name', ({ cases: testCases }) => {
      it.each(testCases)('parses $input', ({ input, output }) => {
        expect(processTransform(input)).toEqual(output);
      });
    });
  });

  describe('converts multiple transforms to the ordered transforms array', () => {
    const cases: {
      input: string;
      output: TransformsArray;
    }[] = [
      {
        input: 'translate(25, 25) scale(2) rotate(45deg)',
        output: [
          { translateX: 25 },
          { translateY: 25 },
          { scale: 2 },
          { rotate: '45deg' },
        ],
      },
      {
        input: 'translate(50, 50) scale(1.5, 2) skew(30deg, 15deg)',
        output: [
          { translateX: 50 },
          { translateY: 50 },
          { scaleX: 1.5 },
          { scaleY: 2 },
          { skewX: '30deg' },
          { skewY: '15deg' },
        ],
      },
      {
        input: 'rotate(90deg) translateX(25) scale(0.5)',
        output: [{ rotate: '90deg' }, { translateX: 25 }, { scale: 0.5 }],
      },
      {
        input: 'scale(2, 3) translate(10px, 20%) rotateX(45deg) rotateY(30deg)',
        output: [
          { scaleX: 2 },
          { scaleY: 3 },
          { translateX: 10 },
          { translateY: '20%' },
          { rotateX: '45deg' },
          { rotateY: '30deg' },
        ],
      },
      {
        input: 'matrix(1, 2, 3, 4, 5, 6) rotate(180deg) scale(1.2)',
        output: [
          { matrix: [1, 2, 0, 0, 3, 4, 0, 0, 0, 0, 1, 0, 5, 6, 0, 1] },
          { rotate: '180deg' },
          { scale: 1.2 },
        ],
      },
      {
        input:
          'matrix(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) skewX(10deg) skewY(5deg)',
        output: [
          { matrix: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
          { skewX: '10deg' },
          { skewY: '5deg' },
        ],
      },
      {
        input:
          'translateX(10) translateY(20) scaleX(1.5) scaleY(0.5) rotateZ(45deg)',
        output: [
          { translateX: 10 },
          { translateY: 20 },
          { scaleX: 1.5 },
          { scaleY: 0.5 },
          { rotateZ: '45deg' },
        ],
      },
    ];

    it.each(cases)('parses $input', ({ input, output }) => {
      expect(processTransform(input)).toEqual(output);
    });
  });

  describe('error handling', () => {
    const cases: {
      input: string;
      errorMessage: string;
    }[] = [
      {
        input: 'translat(25, 25)', // Misspelled "translate"
        errorMessage: ERROR_MESSAGES.invalidTransform('translat(25, 25)'),
      },
      {
        input: 'rotate(90)', // Missing units for angle
        errorMessage: ERROR_MESSAGES.invalidTransform('rotate(90)'),
      },
      {
        input: 'scaleX()', // Empty value for scaleX
        errorMessage: ERROR_MESSAGES.invalidTransform('scaleX()'),
      },
      {
        input: 'skew(45deg, 90)', // Missing units for second skew value
        errorMessage: ERROR_MESSAGES.invalidTransform('skew(45deg, 90)'),
      },
      {
        input: 'matrix(1, 2, 3)', // Incorrect number of elements for matrix (should be 6 or 16)
        errorMessage: ERROR_MESSAGES.invalidTransform('matrix(1, 2, 3)'),
      },
      {
        input: 'matrix(1, 2, 3, 4, 5, 6, 7)', // Incorrect number of elements for matrix
        errorMessage: ERROR_MESSAGES.invalidTransform(
          'matrix(1, 2, 3, 4, 5, 6, 7)'
        ),
      },
      {
        input: 'rotateX(45)', // Missing units for X rotation
        errorMessage: ERROR_MESSAGES.invalidTransform('rotateX(45)'),
      },
      {
        input: 'translateY(25px, 10px)', // Extra value for translateY
        errorMessage: ERROR_MESSAGES.invalidTransform('translateY(25px, 10px)'),
      },
      {
        input: 'scale(2, 3, 4)', // Extra value for scale
        errorMessage: ERROR_MESSAGES.invalidTransform('scale(2, 3, 4)'),
      },
      {
        input: 'skewX(45deg, 30deg)', // Extra value for skewX
        errorMessage: ERROR_MESSAGES.invalidTransform('skewX(45deg, 30deg)'),
      },
      {
        input: 'rotate(90grad)', // Unsupported angle unit
        errorMessage: ERROR_MESSAGES.invalidTransform('rotate(90grad)'),
      },
    ];

    it.each(cases)(
      'throws an error for invalid input: $input',
      ({ input, errorMessage }) => {
        expect(() => processTransform(input)).toThrow(
          new ReanimatedError(errorMessage)
        );
      }
    );
  });
});
