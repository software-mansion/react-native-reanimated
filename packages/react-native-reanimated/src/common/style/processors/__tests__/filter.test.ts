'use strict';
import type { FilterArray } from '../../../types';
import { ValueProcessorTarget } from '../../../types';
import { ERROR_MESSAGES as COLOR_ERROR_MESSAGES } from '../colors';
import { ERROR_MESSAGES, processFilter } from '../filter';

const expectInvalidFilter = (input: unknown) => {
  expect(() => processFilter(input as string)).toThrow(
    new Error(`[Reanimated] ${ERROR_MESSAGES.invalidFilter(input)}`)
  );
};

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
        // CSS spells these two filter functions in kebab-case; React Native's
        // own processFilter accepts them, so a string valid there must not be
        // dropped here.
        name: 'kebab-case CSS filter names',
        cases: [
          {
            input: 'hue-rotate(180deg)',
            output: [{ hueRotate: 180 }],
          },
          {
            input: 'drop-shadow(10 10 5 red)',
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
          {
            // A single unrecognized name used to discard every other filter in
            // the string as well.
            input: 'blur(3px) hue-rotate(180deg)',
            output: [{ blur: 3 }, { hueRotate: 180 }],
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

  test('numeric hueRotate in array input is treated as degrees', () => {
    expect(processFilter([{ hueRotate: 90 }])).toEqual([{ hueRotate: 90 }]);
  });

  describe('throws for invalid filter values', () => {
    describe('string inputs', () => {
      const invalidStringCases: { name: string; input: string }[] = [
        {
          name: 'negative blur string',
          input: 'blur(-5px)',
        },
        {
          name: 'negative percentage filter',
          input: 'brightness(-0.5)',
        },
        {
          name: 'invalidates all filters if any is invalid',
          input: 'brightness(0.5) blur(-5)',
        },
        {
          name: 'missing filter value',
          input: 'brightness()',
        },
        {
          name: 'non-numeric filter value',
          input: 'contrast(two)',
        },
        {
          name: 'hueRotate string without units',
          input: 'hueRotate(90)',
        },
        {
          name: 'unknown filter name',
          input: 'unknownFilter(5)',
        },
        {
          name: 'unknown kebab-case filter name',
          input: 'spin-around(5deg)',
        },
        {
          name: 'completely invalid string',
          input: 'not a filter',
        },
      ];

      test.each(invalidStringCases)('$name throws', ({ input }) => {
        expectInvalidFilter(input);
      });
    });

    describe('array/object filter inputs', () => {
      const invalidArrayCases: {
        name: string;
        input: Parameters<typeof processFilter>[0];
      }[] = [
        {
          name: 'negative blur in array input',
          input: [{ blur: -5 }],
        },
        {
          name: 'negative brightness in array input',
          input: [{ brightness: -0.5 }],
        },
        {
          name: 'hueRotate string without units in array input',
          input: [{ hueRotate: '90' }],
        },
        {
          name: 'negative dropShadow standardDeviation in array input',
          input: [
            {
              dropShadow: {
                color: 'red',
                offsetX: 1,
                offsetY: 1,
                standardDeviation: -1,
              },
            },
          ],
        },
        {
          name: 'invalidates all array filters if any is invalid',
          input: [{ brightness: 0.5 }, { blur: -5 }],
        },
        {
          name: 'empty filter object in array input',
          input: [{}, { brightness: 1 }] as never,
        },
      ];

      test.each(invalidArrayCases)('$name throws', ({ input }) => {
        expectInvalidFilter(input);
      });
    });
  });

  describe('drop shadow with an invalid color', () => {
    test.each([
      ['drop-shadow(0 0 4px notacolor)', 'notacolor'],
      ['dropShadow(0 0 4px notacolor)', 'notacolor'],
      // Only `px` and unitless lengths are lengths, so `4em` is read as a color.
      ['drop-shadow(2em 4em)', '4em'],
      [
        [{ dropShadow: { color: 'notacolor', offsetX: 1, offsetY: 1 } }],
        'notacolor',
      ],
    ])('%p throws the color error', (input, color) => {
      expect(() => processFilter(input as string)).toThrow(
        new Error(`[Reanimated] ${COLOR_ERROR_MESSAGES.invalidColor(color)}`)
      );
    });
  });

  describe('non-filter input type', () => {
    test.each([
      { name: 'number input', input: 123 },
      { name: 'object input', input: {} },
    ])('throws for $name', ({ input }) => {
      expectInvalidFilter(input);
    });
  });

  describe('clearing the filter', () => {
    test.each([
      { name: 'none', input: 'none' },
      { name: 'empty string', input: '' },
      { name: 'empty array', input: [] },
      { name: 'null', input: null },
      { name: 'undefined', input: undefined },
    ])('returns empty array for $name', ({ input }) => {
      expect(processFilter(input as string)).toEqual([]);
    });
  });
});
