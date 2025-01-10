import { ReanimatedError } from '../../../../../errors';
import type {
  NormalizedTransformOrigin,
  TransformOrigin,
} from '../../../types';
import { ERROR_MESSAGES, processTransformOrigin } from '../transformOrigin';

describe(processTransformOrigin, () => {
  describe('valid cases', () => {
    const validCases: {
      name: string;
      cases: {
        name: string;
        cases: { input: TransformOrigin; output: NormalizedTransformOrigin }[];
      }[];
    }[] = [
      {
        name: 'one-value syntax',
        cases: [
          {
            name: 'keyword',
            cases: [
              { input: 'left', output: [0, '50%', 0] },
              { input: 'right', output: ['100%', '50%', 0] },
              { input: 'top', output: ['50%', 0, 0] },
              { input: 'bottom', output: ['50%', '100%', 0] },
              { input: 'center', output: ['50%', '50%', 0] },
            ],
          },
          {
            name: 'percentage',
            cases: [
              { input: '0%', output: [0, '50%', 0] },
              { input: '25%', output: ['25%', '50%', 0] },
              { input: '100%', output: ['100%', '50%', 0] },
            ],
          },
          {
            name: 'pixel',
            cases: [
              { input: '0', output: [0, '50%', 0] },
              { input: '25', output: [25, '50%', 0] },
              { input: '100', output: [100, '50%', 0] },
            ],
          },
        ],
      },
      {
        name: 'two-value syntax',
        cases: [
          {
            name: 'keyword',
            cases: [
              { input: 'left top', output: [0, 0, 0] },
              { input: 'right bottom', output: ['100%', '100%', 0] },
              { input: 'center center', output: ['50%', '50%', 0] },
              { input: 'top right', output: ['100%', 0, 0] },
              { input: 'right top', output: ['100%', 0, 0] },
              { input: 'bottom left', output: [0, '100%', 0] },
              { input: 'left bottom', output: [0, '100%', 0] },
              { input: 'center top', output: ['50%', 0, 0] },
              { input: 'center bottom', output: ['50%', '100%', 0] },
            ],
          },
          {
            name: 'percentage',
            cases: [
              { input: '0% 0%', output: [0, 0, 0] },
              { input: '25% 25%', output: ['25%', '25%', 0] },
              { input: '100% 100%', output: ['100%', '100%', 0] },
              { input: '0% 100%', output: [0, '100%', 0] },
              { input: '100% 0%', output: ['100%', 0, 0] },
              { input: '50% 50%', output: ['50%', '50%', 0] },
            ],
          },
          {
            name: 'pixel',
            cases: [
              { input: '0 0', output: [0, 0, 0] },
              { input: '25 25', output: [25, 25, 0] },
              { input: '100 100', output: [100, 100, 0] },
              { input: '0 100', output: [0, 100, 0] },
              { input: '100 0', output: [100, 0, 0] },
              { input: '50 50', output: [50, 50, 0] },
            ],
          },
          {
            name: 'mixed',
            cases: [
              { input: '0% top', output: [0, 0, 0] },
              { input: 'right 0%', output: ['100%', 0, 0] },
              { input: '100% bottom', output: ['100%', '100%', 0] },
              { input: 'left 100%', output: [0, '100%', 0] },
              { input: '25% 25', output: ['25%', 25, 0] },
              { input: '25 25%', output: [25, '25%', 0] },
              { input: 'left 100', output: [0, 100, 0] },
              { input: 'center 100', output: ['50%', 100, 0] },
            ],
          },
        ],
      },
      {
        name: 'three-value syntax',
        cases: [
          {
            name: 'with mixed x and y values',
            cases: [
              { input: 'left top 0', output: [0, 0, 0] },
              { input: 'right 0 0', output: ['100%', 0, 0] },
              { input: '100% bottom 25', output: ['100%', '100%', 25] },
              { input: 'left 100 100', output: [0, 100, 100] },
              { input: '25 25% 25', output: [25, '25%', 25] },
              { input: '25% 25 25', output: ['25%', 25, 25] },
            ],
          },
        ],
      },
      {
        name: 'array syntax',
        cases: [
          {
            name: 'using numeric values',
            cases: [
              { input: [0], output: [0, '50%', 0] },
              { input: [25], output: [25, '50%', 0] },
              { input: [100], output: [100, '50%', 0] },
              { input: [0, 0], output: [0, 0, 0] },
              { input: [25, 25], output: [25, 25, 0] },
              { input: [100, 100], output: [100, 100, 0] },
              { input: [0, 0, 0], output: [0, 0, 0] },
              { input: [25, 25, 25], output: [25, 25, 25] },
              { input: [100, 100, 100], output: [100, 100, 100] },
            ],
          },
          {
            name: 'using percentage values',
            cases: [
              { input: ['0%'], output: [0, '50%', 0] },
              { input: ['25%'], output: ['25%', '50%', 0] },
              { input: ['100%'], output: ['100%', '50%', 0] },
              { input: ['0%', '0%'], output: [0, 0, 0] },
              { input: ['25%', '25%'], output: ['25%', '25%', 0] },
              { input: ['100%', '100%'], output: ['100%', '100%', 0] },
              { input: ['0%', '0%', 0], output: [0, 0, 0] },
              { input: ['25%', '25%', 25], output: ['25%', '25%', 25] },
              { input: ['100%', '100%', 100], output: ['100%', '100%', 100] },
            ],
          },
        ],
      },
    ];

    describe.each(validCases)('$name', ({ cases }) => {
      describe.each(cases)('$name', ({ cases: testCases }) => {
        it.each(testCases)(
          'converts $input to $output',
          ({ input, output }) => {
            expect(processTransformOrigin(input)).toEqual(output);
          }
        );
      });
    });
  });

  describe('invalid cases', () => {
    const invalidCases = [
      {
        name: 'one-value syntax',
        cases: [
          {
            name: 'invalid',
            cases: [
              {
                input: 'invalid',
                message: ERROR_MESSAGES.invalidComponent('invalid', 'invalid'),
              },
            ],
          },
        ],
      },
      {
        name: 'two-value syntax',
        cases: [
          {
            name: 'invalid',
            cases: [
              {
                input: 'left invalid',
                message: ERROR_MESSAGES.invalidComponent(
                  'invalid',
                  'left invalid'
                ),
              },
              {
                input: '100% left',
                message: ERROR_MESSAGES.invalidKeyword('left', 'y', [
                  'top',
                  'center',
                  'bottom',
                ]),
              },
              {
                input: 'top 100%',
                message: ERROR_MESSAGES.invalidKeyword('top', 'x', [
                  'left',
                  'center',
                  'right',
                ]),
              },
            ],
          },
        ],
      },
      {
        name: 'three-value syntax',
        cases: [
          {
            name: 'invalid',
            cases: [
              {
                input: 'left top invalid',
                message: ERROR_MESSAGES.invalidComponent(
                  'invalid',
                  'left top invalid'
                ),
              },
              {
                input: 'left 100% 25%',
                message: ERROR_MESSAGES.invalidComponent(
                  '25%',
                  'left 100% 25%'
                ),
              },
            ],
          },
        ],
      },
    ];

    describe.each(invalidCases)('$name', ({ cases }) => {
      describe.each(cases)('$name', ({ cases: testCases }) => {
        it.each(testCases)(
          'throws error with message "$message" for input "$input"',
          ({ input, message }) => {
            expect(() => processTransformOrigin(input)).toThrow(
              ReanimatedError(message)
            );
          }
        );
      });
    });
  });
});
