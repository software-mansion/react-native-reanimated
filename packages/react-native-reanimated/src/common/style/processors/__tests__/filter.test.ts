'use strict';
import { ReanimatedError } from '../../../errors';
import type { FilterArray } from '../../../types';
import { ValueProcessorTarget } from '../../../types';
import { ERROR_MESSAGES, processFilter } from '../filter';

describe(processFilter, () => {
  test('returns the same object if not a string', () => {
    expect(processFilter([{ brightness: 1 }])).toEqual([{ brightness: 1 }]);
  });

  describe('converts filter string to filter objects', () => {
    const cases: {
      name: string;
      cases: { input: string; output: FilterArray }[];
    }[] = [
      {
        name: 'brightness',
        cases: [
          {
            input: 'brightness(0.5)',
            output: [{ brightness: 0.5 }],
          },
          {
            input: 'brightness(1)',
            output: [{ brightness: 1 }],
          },
        ],
      },
      {
        name: 'contrast',
        cases: [
          {
            input: 'contrast(2)',
            output: [{ contrast: 2 }],
          },
          {
            input: 'contrast(0)',
            output: [{ contrast: 0 }],
          },
        ],
      },
      {
        name: 'blur',
        cases: [
          {
            input: 'blur(5)',
            output: [{ blur: 5 }],
          },
          {
            input: 'blur(0)',
            output: [{ blur: 0 }],
          },
        ],
      },
      {
        name: 'saturate',
        cases: [
          {
            input: 'saturate(1.5)',
            output: [{ saturate: 1.5 }],
          },
        ],
      },
      {
        name: 'sepia',
        cases: [
          {
            input: 'sepia(0.8)',
            output: [{ sepia: 0.8 }],
          },
        ],
      },
      {
        name: 'invert',
        cases: [
          {
            input: 'invert(0.2)',
            output: [{ invert: 0.2 }],
          },
        ],
      },
      {
        name: 'hueRotate with deg',
        cases: [
          {
            input: 'hueRotate(180deg)',
            output: [{ hueRotate: 180 }],
          },
        ],
      },
      {
        name: 'hueRotate with rad',
        cases: [
          {
            input: 'hueRotate(3.14rad)',
            output: [{ hueRotate: (180 * 3.14) / Math.PI }],
          },
        ],
      },
      {
        name: 'dropShadow',
        cases: [
          {
            input: 'dropShadow(10 10 5 red)',
            output: [
              {
                dropShadow: {
                  offsetX: 10,
                  offsetY: 10,
                  standardDeviation: 5,
                  color: 4294901760,
                },
              },
            ],
          },
        ],
      },
    ];

    describe.each(cases)('$name', ({ cases: testCases }) => {
      test.each(testCases)('parses $input', ({ input, output }) => {
        expect(processFilter(input)).toEqual(output);
      });
    });
  });

  describe('context-aware color processing', () => {
    test('keeps transparent color numeric by default', () => {
      const result = processFilter('dropShadow(0 0 0 transparent)');

      expect(result).toEqual([
        {
          dropShadow: {
            color: 0, // transparent color for non-CSS target
            offsetX: 0,
            offsetY: 0,
            standardDeviation: 0,
          },
        },
      ]);
    });

    test('converts transparent color to false with CSS target', () => {
      const result = processFilter('dropShadow(0 0 0 transparent)', {
        target: ValueProcessorTarget.CSS,
      });

      expect(result).toEqual([
        {
          dropShadow: {
            color: false, // transparent color for CSS target
            offsetX: 0,
            offsetY: 0,
            standardDeviation: 0,
          },
        },
      ]);
    });
  });

  describe('converts multiple filters to the ordered filter array', () => {
    const cases: {
      input: string;
      output: FilterArray;
    }[] = [
      {
        input: 'brightness(0.5) contrast(2) blur(5)',
        output: [{ brightness: 0.5 }, { contrast: 2 }, { blur: 5 }],
      },
      {
        input: 'saturate(1.2) sepia(0.5) invert(0.3)',
        output: [{ saturate: 1.2 }, { sepia: 0.5 }, { invert: 0.3 }],
      },
    ];

    test.each(cases)('parses $input', ({ input, output }) => {
      expect(processFilter(input)).toEqual(output);
    });
  });

  describe('converts multiple filters with units to the ordered filter array', () => {
    const cases: {
      input: string;
      output: FilterArray;
    }[] = [
      {
        input: 'brightness(50%) contrast(20%)',
        output: [{ brightness: 0.5 }, { contrast: 0.2 }],
      },
      {
        input: 'saturate(120%) sepia(70%) invert(30%)',
        output: [{ saturate: 1.2 }, { sepia: 0.7 }, { invert: 0.3 }],
      },
    ];

    test.each(cases)('parses $input', ({ input, output }) => {
      expect(processFilter(input)).toEqual(output);
    });
  });

  describe('error handling', () => {
    const cases: { input: string; errorMessage: string }[] = [
      {
        input: 'brightness()', // missing value
        errorMessage: ERROR_MESSAGES.invalidFilter('brightness()'),
      },
      {
        input: 'contrast(two)', // invalid number
        errorMessage: ERROR_MESSAGES.invalidFilter('contrast(two)'),
      },
      {
        input: 'blur()', // missing value
        errorMessage: ERROR_MESSAGES.invalidFilter('blur()'),
      },
      {
        input: 'hueRotate(90)', // missing units
        errorMessage: ERROR_MESSAGES.invalidFilter('hueRotate(90)'),
      },
      {
        input: 'unknownFilter(5)',
        errorMessage: ERROR_MESSAGES.invalidFilter('unknownFilter(5)'),
      },
    ];

    test.each(cases)(
      'throws an error for invalid input: $input',
      ({ input, errorMessage }) => {
        expect(() => processFilter(input)).toThrow(
          new ReanimatedError(errorMessage)
        );
      }
    );
  });
});
