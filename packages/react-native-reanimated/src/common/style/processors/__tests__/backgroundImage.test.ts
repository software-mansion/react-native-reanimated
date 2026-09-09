'use strict';
import type { ViewStyle } from 'react-native';

import { ValueProcessorTarget } from '../../../types';
import type { ProcessedBackgroundImageValue } from '../backgroundImage';
import { ERROR_MESSAGES, processBackgroundImage } from '../backgroundImage';
import {
  ERROR_MESSAGES as COLOR_ERROR_MESSAGES,
  processColor,
} from '../colors';

type BackgroundImageInput = NonNullable<ViewStyle['backgroundImage']>;
type BackgroundImageValue = Exclude<BackgroundImageInput, string>[number];
type RadialGradientInput = Extract<
  BackgroundImageValue,
  { type: 'radial-gradient' }
>;

type ProcessedLinearGradient = Extract<
  ProcessedBackgroundImageValue,
  { type: 'linear-gradient' }
>;
type ProcessedRadialGradient = Extract<
  ProcessedBackgroundImageValue,
  { type: 'radial-gradient' }
>;
type ProcessedDirection = ProcessedLinearGradient['direction'];
type RadialPrelude = Pick<
  ProcessedRadialGradient,
  'shape' | 'size' | 'position'
>;

const process = (
  value: BackgroundImageInput,
  context?: Parameters<typeof processBackgroundImage>[1]
) =>
  processBackgroundImage(value, context) as
    | ProcessedBackgroundImageValue[]
    | undefined;

const processLinear = (value: BackgroundImageInput) =>
  process(value)?.[0] as ProcessedLinearGradient;

const linear = (
  gradient: Partial<Extract<BackgroundImageValue, { type: 'linear-gradient' }>>
): BackgroundImageValue => ({
  type: 'linear-gradient',
  colorStops: [{ color: '#ff0000' }],
  ...gradient,
});

const radial = (gradient: Partial<RadialGradientInput>): BackgroundImageValue =>
  ({
    type: 'radial-gradient',
    colorStops: [{ color: '#ff0000' }],
    ...gradient,
  }) as RadialGradientInput;

const RED = processColor('#ff0000');
const BLUE = processColor('#0000ff');

describe(processBackgroundImage, () => {
  test('returns undefined for non-array non-string values', () => {
    expect(process(null as unknown as BackgroundImageInput)).toBeUndefined();
  });

  test('returns an empty array for an empty array', () => {
    expect(process([])).toEqual([]);
  });

  test('skips entries with an unknown type', () => {
    expect(
      process([
        {
          type: 'conic-gradient',
          colorStops: [],
        } as unknown as RadialGradientInput,
      ])
    ).toEqual([]);
  });

  test('keeps the order of multiple layers', () => {
    expect(
      process([
        radial({ shape: 'circle' }),
        linear({ direction: 'to top' }),
      ])?.map(({ type }) => type)
    ).toEqual(['radial-gradient', 'linear-gradient']);
  });

  describe('css strings', () => {
    const WHITE = processColor('#ffffff');
    const CENTER = { top: '50%', left: '50%' };

    test('parses a linear gradient', () => {
      expect(process('linear-gradient(to right, #ff0000, #0000ff)')).toEqual([
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 90 },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ]);
    });

    test.each([
      ['45deg', { type: 'angle', value: 45 }],
      ['0.5turn', { type: 'angle', value: 180 }],
      ['to left', { type: 'angle', value: 270 }],
      ['to top right', { type: 'keyword', value: 'to top right' }],
      ['TO LEFT TOP', { type: 'keyword', value: 'to top left' }],
    ] satisfies [string, ProcessedDirection][])(
      'parses linear direction %p',
      (direction, expected) => {
        expect(
          processLinear(`linear-gradient(${direction}, #ff0000, #0000ff)`)
            .direction
        ).toEqual(expected);
      }
    );

    test('defaults linear direction when the first part is a color', () => {
      expect(
        processLinear('linear-gradient(#ff0000, #0000ff)').direction
      ).toEqual({ type: 'angle', value: 180 });
    });

    test('parses color stop positions', () => {
      expect(
        process(
          'linear-gradient(#ff0000 10%, #0000ff 20px, #ffffff 30% 40%)'
        )?.[0].colorStops
      ).toEqual([
        { color: RED, position: '10%' },
        { color: BLUE, position: 20 },
        { color: WHITE, position: '30%' },
        { color: WHITE, position: '40%' },
      ]);
    });

    test('parses transition hints', () => {
      expect(
        process('linear-gradient(#ff0000, 20%, #0000ff)')?.[0].colorStops
      ).toEqual([
        { color: RED, position: null },
        { color: null, position: '20%' },
        { color: BLUE, position: null },
      ]);
    });

    test('keeps colors with commas inside', () => {
      expect(
        process('linear-gradient(rgba(255, 0, 0, 1), rgb(0, 0, 255))')?.[0]
          .colorStops
      ).toEqual([
        { color: RED, position: null },
        { color: BLUE, position: null },
      ]);
    });

    test('parses multiple gradients and ignores newlines and case', () => {
      expect(
        process(
          'LINEAR-GRADIENT(To Right, #FF0000, #0000FF),\n radial-gradient(#ffffff, #ff0000)'
        )?.map(({ type }) => type)
      ).toEqual(['linear-gradient', 'radial-gradient']);
    });

    test('parses radial gradient defaults', () => {
      expect(process('radial-gradient(#ff0000, #0000ff)')).toEqual([
        {
          type: 'radial-gradient',
          shape: 'ellipse',
          size: 'farthest-corner',
          position: CENTER,
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ]);
    });

    test.each([
      [
        'circle',
        { shape: 'circle', size: 'farthest-corner', position: CENTER },
      ],
      [
        'closest-side',
        { shape: 'ellipse', size: 'closest-side', position: CENTER },
      ],
      [
        'circle closest-corner',
        { shape: 'circle', size: 'closest-corner', position: CENTER },
      ],
      ['50px', { shape: 'circle', size: { x: 50, y: 50 }, position: CENTER }],
      [
        '50px 30%',
        { shape: 'ellipse', size: { x: 50, y: '30%' }, position: CENTER },
      ],
      [
        'ellipse 20% 30%',
        { shape: 'ellipse', size: { x: '20%', y: '30%' }, position: CENTER },
      ],
      [
        'at center',
        { shape: 'ellipse', size: 'farthest-corner', position: CENTER },
      ],
      [
        'at left',
        {
          shape: 'ellipse',
          size: 'farthest-corner',
          position: { top: '50%', left: '0%' },
        },
      ],
      [
        'at bottom',
        {
          shape: 'ellipse',
          size: 'farthest-corner',
          position: { top: '100%', left: '50%' },
        },
      ],
      [
        'at 10%',
        {
          shape: 'ellipse',
          size: 'farthest-corner',
          position: { top: '50%', left: '10%' },
        },
      ],
      [
        'at right top',
        {
          shape: 'ellipse',
          size: 'farthest-corner',
          position: { top: '0%', left: '100%' },
        },
      ],
      [
        'at top right',
        {
          shape: 'ellipse',
          size: 'farthest-corner',
          position: { top: '0%', left: '100%' },
        },
      ],
      [
        'at 10% 20px',
        {
          shape: 'ellipse',
          size: 'farthest-corner',
          position: { top: 20, left: '10%' },
        },
      ],
      [
        'at left 10% top 20%',
        {
          shape: 'ellipse',
          size: 'farthest-corner',
          position: { top: '20%', left: '10%' },
        },
      ],
      [
        'at right 10% bottom 20%',
        {
          shape: 'ellipse',
          size: 'farthest-corner',
          position: { bottom: '20%', right: '10%' },
        },
      ],
      [
        'circle 50px at top left',
        {
          shape: 'circle',
          size: { x: 50, y: 50 },
          position: { top: '0%', left: '0%' },
        },
      ],
      [
        '50px at top left',
        {
          shape: 'circle',
          size: { x: 50, y: 50 },
          position: { top: '0%', left: '0%' },
        },
      ],
    ] satisfies [string, RadialPrelude][])(
      'parses radial prelude %p',
      (prelude, expected) => {
        expect(
          process(`radial-gradient(${prelude}, #ff0000, #0000ff)`)?.[0]
        ).toMatchObject(expected);
      }
    );

    test.each([
      'linear-gradient()',
      'linear-gradient(to nowhere, #ff0000, #0000ff)',
      'linear-gradient(to right right, #ff0000, #0000ff)',
      'linear-gradient(not-a-color, #0000ff)',
      'linear-gradient(#ff0000 abc%, #0000ff)',
      'linear-gradient(#ff0000 abcpx, #0000ff)',
      'linear-gradient(#ff0000 10% 20% 30%, #0000ff)',
      'linear-gradient(20%, #ff0000, #0000ff)',
      'linear-gradient(#ff0000, #0000ff, 20%)',
      'linear-gradient(#ff0000, 20%, 30%, #0000ff)',
      'radial-gradient(ellipse 50px, #ff0000, #0000ff)',
      'radial-gradient(-50px, #ff0000, #0000ff)',
      'radial-gradient(-50%, #ff0000, #0000ff)',
      'radial-gradient(50px -30%, #ff0000, #0000ff)',
      'radial-gradient(at constructor, #ff0000, #0000ff)',
      'radial-gradient(at valueOf top, #ff0000, #0000ff)',
      'radial-gradient(at left toString, #ff0000, #0000ff)',
      'radial-gradient(at hasOwnProperty 10%, #ff0000, #0000ff)',
      'radial-gradient(at, #ff0000, #0000ff)',
      'radial-gradient(at nowhere, #ff0000, #0000ff)',
      'radial-gradient(at 10% 20% 30%, #ff0000, #0000ff)',
      'radial-gradient(at middle 10% top 20%, #ff0000, #0000ff)',
      'conic-gradient(#ff0000, #0000ff)',
      'not a gradient',
      '',
    ])('skips invalid gradient %p', (value) => {
      expect(process(value)).toEqual([]);
    });

    test('forwards the processor context to string colors', () => {
      expect(
        process('linear-gradient(transparent, #0000ff)', {
          target: ValueProcessorTarget.CSS,
        })?.[0].colorStops[0]
      ).toEqual({ color: false, position: null });
    });
  });

  describe('linear gradients', () => {
    test('converts direction keywords to angles', () => {
      expect(
        process([
          linear({
            direction: 'to right',
            colorStops: [{ color: '#ff0000' }, { color: '#0000ff' }],
          }),
        ])
      ).toEqual([
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 90 },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ]);
    });

    test.each([
      ['to top', { type: 'angle', value: 0 }],
      ['to right', { type: 'angle', value: 90 }],
      ['to bottom', { type: 'angle', value: 180 }],
      ['to left', { type: 'angle', value: 270 }],
      ['to top right', { type: 'keyword', value: 'to top right' }],
      ['to right top', { type: 'keyword', value: 'to top right' }],
      ['to bottom right', { type: 'keyword', value: 'to bottom right' }],
      ['to right bottom', { type: 'keyword', value: 'to bottom right' }],
      ['to top left', { type: 'keyword', value: 'to top left' }],
      ['to left top', { type: 'keyword', value: 'to top left' }],
      ['to bottom left', { type: 'keyword', value: 'to bottom left' }],
      ['to left bottom', { type: 'keyword', value: 'to bottom left' }],
      ['To Right', { type: 'angle', value: 90 }],
      ['to   right', { type: 'angle', value: 90 }],
      ['to\tbottom\n left', { type: 'keyword', value: 'to bottom left' }],
    ] satisfies [string, ProcessedDirection][])(
      'converts direction keyword %p',
      (input, expected) => {
        expect(processLinear([linear({ direction: input })]).direction).toEqual(
          expected
        );
      }
    );

    test.each([
      ['45deg', 45],
      ['45DEG', 45],
      ['100grad', 90],
      ['1rad', 180 / Math.PI],
      ['0.5turn', 180],
      ['1.5907e-12deg', 1.5907e-12],
      ['-2.5e2deg', -250],
      ['1e2grad', 90],
    ] satisfies [string, number][])(
      'converts angle unit %s',
      (input, expected) => {
        expect(processLinear([linear({ direction: input })]).direction).toEqual(
          {
            type: 'angle',
            value: expected,
          }
        );
      }
    );

    test('defaults direction to 180deg', () => {
      expect(processLinear([linear({})]).direction).toEqual({
        type: 'angle',
        value: 180,
      });
    });

    test.each(['sideways', '45px', '45', 'to center', 'to right right'])(
      'throws on invalid direction %p',
      (direction) => {
        expect(() => process([linear({ direction })])).toThrow(
          new Error(
            `[Reanimated] ${ERROR_MESSAGES.invalidDirection(direction)}`
          )
        );
      }
    );
  });

  describe('color stops', () => {
    test('expands double position stops into two stops', () => {
      expect(
        process([
          linear({
            colorStops: [{ color: '#ff0000', positions: ['0%', '50%'] }],
          }),
        ])?.[0].colorStops
      ).toEqual([
        { color: RED, position: '0%' },
        { color: RED, position: '50%' },
      ]);
    });

    test('keeps transition hint stops with a null color', () => {
      expect(
        process([
          linear({
            colorStops: [
              { color: '#ff0000' },
              { color: null, positions: ['20%'] },
              { color: '#0000ff' },
            ],
          }),
        ])?.[0].colorStops
      ).toEqual([
        { color: RED, position: null },
        { color: null, position: '20%' },
        { color: BLUE, position: null },
      ]);
    });

    test('accepts numeric positions', () => {
      expect(
        process([
          linear({
            colorStops: [
              { color: '#ff0000', positions: [0.25] as unknown as string[] },
            ],
          }),
        ])?.[0].colorStops
      ).toEqual([{ color: RED, position: 0.25 }]);
    });

    test('forwards the processor context to colors', () => {
      expect(
        process([linear({ colorStops: [{ color: 'transparent' }] })], {
          target: ValueProcessorTarget.CSS,
        })?.[0].colorStops
      ).toEqual([{ color: false, position: null }]);
    });

    test('throws on a null color with a position count other than one', () => {
      expect(() =>
        process([
          linear({ colorStops: [{ color: null, positions: ['10%', '20%'] }] }),
        ])
      ).toThrow(
        new Error(`[Reanimated] ${COLOR_ERROR_MESSAGES.invalidColor(null)}`)
      );
    });

    test('throws on an invalid color', () => {
      expect(() =>
        process([linear({ colorStops: [{ color: 'not-a-color' }] })])
      ).toThrow(
        new Error(
          `[Reanimated] ${COLOR_ERROR_MESSAGES.invalidColor('not-a-color')}`
        )
      );
    });

    test.each(['50px', '50', 'center', 'abc%', '%', '50 %'])(
      'throws on invalid position %p',
      (position) => {
        expect(() =>
          process([
            linear({
              colorStops: [{ color: '#ff0000', positions: [position] }],
            }),
          ])
        ).toThrow(
          new Error(`[Reanimated] ${ERROR_MESSAGES.invalidPosition(position)}`)
        );
      }
    );

    test('throws on an invalid transition hint position', () => {
      expect(() =>
        process([
          linear({ colorStops: [{ color: null, positions: ['50px'] }] }),
        ])
      ).toThrow(
        new Error(`[Reanimated] ${ERROR_MESSAGES.invalidPosition('50px')}`)
      );
    });
  });

  describe('radial gradients', () => {
    test('applies shape, size and position defaults', () => {
      expect(process([radial({})])).toEqual([
        {
          type: 'radial-gradient',
          shape: 'ellipse',
          size: 'farthest-corner',
          position: { top: '50%', left: '50%' },
          colorStops: [{ color: RED, position: null }],
        },
      ]);
    });

    test('does not share the default position between gradients', () => {
      const [first, second] = process([
        radial({}),
        radial({}),
      ]) as ProcessedRadialGradient[];
      expect(first.position).toEqual(second.position);
      expect(first.position).not.toBe(second.position);
    });

    test.each([
      'closest-side',
      'closest-corner',
      'farthest-side',
      'farthest-corner',
    ] as const)('keeps size keyword %p', (size) => {
      expect(process([radial({ size })])?.[0]).toMatchObject({ size });
    });

    test('keeps explicit size objects', () => {
      expect(
        process([
          radial({
            shape: 'circle',
            size: { x: '30%', y: '40%' },
            position: { top: '10%', left: '20%' },
          }),
        ])?.[0]
      ).toEqual({
        type: 'radial-gradient',
        shape: 'circle',
        size: { x: '30%', y: '40%' },
        position: { top: '10%', left: '20%' },
        colorStops: [{ color: RED, position: null }],
      });
    });

    test('keeps explicit positions', () => {
      expect(
        process([radial({ position: { bottom: '10%', right: '20%' } })])?.[0]
      ).toMatchObject({ position: { bottom: '10%', right: '20%' } });
    });

    test('throws on an invalid shape', () => {
      expect(() =>
        process([radial({ shape: 'square' as unknown as 'circle' })])
      ).toThrow(
        new Error(`[Reanimated] ${ERROR_MESSAGES.invalidShape('square')}`)
      );
    });

    test.each(['nearest-side', { x: '30%' }, { y: '30%' }, {}])(
      'throws on invalid size %p',
      (size) => {
        expect(() =>
          process([
            radial({ size: size as unknown as RadialGradientInput['size'] }),
          ])
        ).toThrow(
          new Error(`[Reanimated] ${ERROR_MESSAGES.invalidSize(size)}`)
        );
      }
    );
  });
});
