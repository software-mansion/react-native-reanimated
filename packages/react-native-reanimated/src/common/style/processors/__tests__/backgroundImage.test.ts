'use strict';
import type { BackgroundImageValue } from '../backgroundImage';
import { processBackgroundImage } from '../backgroundImage';
import { processColor } from '../colors';

const RED = processColor('red');
const BLUE = processColor('blue');
const GREEN = processColor('green');

describe(processBackgroundImage, () => {
  describe('when input is a string', () => {
    test('returns an empty array for "none"', () => {
      expect(processBackgroundImage('none')).toEqual([]);
    });

    test('parses a linear gradient with the default direction', () => {
      expect(processBackgroundImage('linear-gradient(red, blue)')).toEqual([
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 180 },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ]);
    });

    test.each([
      ['45deg', 45],
      ['0.5turn', 180],
      ['100grad', 90],
      [`${Math.PI}rad`, 180],
    ])('parses a linear gradient with the %s angle', (angle, expected) => {
      expect(
        processBackgroundImage(`linear-gradient(${angle}, red, blue)`)
      ).toEqual([
        expect.objectContaining({
          direction: { type: 'angle', value: expect.closeTo(expected, 5) },
        }),
      ]);
    });

    test.each([
      ['to top', { type: 'angle', value: 0 }],
      ['to right', { type: 'angle', value: 90 }],
      ['to bottom', { type: 'angle', value: 180 }],
      ['to left', { type: 'angle', value: 270 }],
      ['to top right', { type: 'keyword', value: 'to top right' }],
      ['to left bottom', { type: 'keyword', value: 'to bottom left' }],
    ])(
      'parses a linear gradient with the "%s" direction',
      (direction, expected) => {
        expect(
          processBackgroundImage(`linear-gradient(${direction}, red, blue)`)
        ).toEqual([expect.objectContaining({ direction: expected })]);
      }
    );

    test('parses color stop positions', () => {
      expect(
        processBackgroundImage(
          'linear-gradient(red 0%, green 25% 50%, blue 100px)'
        )
      ).toEqual([
        expect.objectContaining({
          colorStops: [
            { color: RED, position: '0%' },
            { color: GREEN, position: '25%' },
            { color: GREEN, position: '50%' },
            { color: BLUE, position: 100 },
          ],
        }),
      ]);
    });

    test('parses transition hints', () => {
      expect(processBackgroundImage('linear-gradient(red, 20%, blue)')).toEqual(
        [
          expect.objectContaining({
            colorStops: [
              { color: RED, position: null },
              { color: null, position: '20%' },
              { color: BLUE, position: null },
            ],
          }),
        ]
      );
    });

    test('parses colors with function syntax', () => {
      expect(
        processBackgroundImage(
          'linear-gradient(rgba(255, 0, 0, 0.5) 10%, rgb(0, 0, 255))'
        )
      ).toEqual([
        expect.objectContaining({
          colorStops: [
            { color: processColor('rgba(255, 0, 0, 0.5)'), position: '10%' },
            { color: processColor('rgb(0, 0, 255)'), position: null },
          ],
        }),
      ]);
    });

    test('parses a radial gradient with default values', () => {
      expect(processBackgroundImage('radial-gradient(red, blue)')).toEqual([
        {
          type: 'radial-gradient',
          shape: 'ellipse',
          size: 'farthest-corner',
          position: { top: '50%', left: '50%' },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ]);
    });

    test('parses a radial gradient with a shape, size and position', () => {
      expect(
        processBackgroundImage(
          'radial-gradient(circle closest-side at 25% 75%, red, blue)'
        )
      ).toEqual([
        expect.objectContaining({
          shape: 'circle',
          size: 'closest-side',
          position: { top: '75%', left: '25%' },
        }),
      ]);
    });

    test('parses a radial gradient with numeric sizes', () => {
      expect(
        processBackgroundImage('radial-gradient(100px 50%, red, blue)')
      ).toEqual([
        expect.objectContaining({
          shape: 'ellipse',
          size: { x: 100, y: '50%' },
        }),
      ]);
    });

    test('infers the circle shape from a single numeric size', () => {
      expect(
        processBackgroundImage('radial-gradient(100px, red, blue)')
      ).toEqual([
        expect.objectContaining({ shape: 'circle', size: { x: 100, y: 100 } }),
      ]);
    });

    test('parses a radial gradient with an explicit size and position', () => {
      expect(
        processBackgroundImage(
          'radial-gradient(circle 100px at 25% 75%, yellow, red)'
        )
      ).toEqual([
        expect.objectContaining({
          shape: 'circle',
          size: { x: 100, y: 100 },
          position: { top: '75%', left: '25%' },
        }),
      ]);
    });

    test('allows percentage sizes for ellipses', () => {
      expect(
        processBackgroundImage('radial-gradient(50% 20%, red, blue)')
      ).toEqual([
        expect.objectContaining({
          shape: 'ellipse',
          size: { x: '50%', y: '20%' },
        }),
      ]);
    });

    test('parses a radial gradient with a two-value size and position', () => {
      expect(
        processBackgroundImage(
          'radial-gradient(100px 50% at left bottom, red, blue)'
        )
      ).toEqual([
        expect.objectContaining({
          shape: 'ellipse',
          size: { x: 100, y: '50%' },
          position: { top: '100%', left: '0%' },
        }),
      ]);
    });

    test('parses a radial gradient with an edge offset position', () => {
      expect(
        processBackgroundImage(
          'radial-gradient(at right 20% bottom 10%, red, blue)'
        )
      ).toEqual([
        expect.objectContaining({ position: { bottom: '10%', right: '20%' } }),
      ]);
    });

    test('parses multiple gradients', () => {
      expect(
        processBackgroundImage(
          'linear-gradient(red, blue), radial-gradient(circle, green, blue)'
        )
      ).toEqual([
        expect.objectContaining({ type: 'linear-gradient' }),
        expect.objectContaining({ type: 'radial-gradient', shape: 'circle' }),
      ]);
    });

    test.each([
      'gradient(red, blue)', // invalid gradient function
      'linear-gradient(red, blue) trailing garbage', // trailing characters
      'linear-gradient(to nowhere, red, blue)', // invalid direction
      'linear-gradient(red 10rem, blue)', // invalid position unit
      'linear-gradient(20%, red, blue)', // hint without a preceding color
      'radial-gradient(square, red, blue)', // invalid color
      'radial-gradient(ellipse 100px, red, blue)', // single size with ellipse
      'radial-gradient(circle 50%, red, blue)', // circle with percentage radius
      'radial-gradient(50%, red, blue)', // inferred circle with percentage radius
    ])('throws for invalid input "%s"', (input) => {
      expect(() => processBackgroundImage(input)).toThrow();
    });
  });

  describe('when input is an array of objects', () => {
    test('processes a linear gradient with the default direction', () => {
      expect(
        processBackgroundImage([
          {
            type: 'linear-gradient',
            colorStops: [{ color: 'red' }, { color: 'blue' }],
          },
        ])
      ).toEqual([
        {
          type: 'linear-gradient',
          direction: { type: 'angle', value: 180 },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ]);
    });

    test.each([
      ['45deg', { type: 'angle', value: 45 }],
      ['to left', { type: 'angle', value: 270 }],
      ['To Bottom Right', { type: 'keyword', value: 'to bottom right' }],
    ] as const)(
      'processes a linear gradient with the "%s" direction',
      (direction, expected) => {
        expect(
          processBackgroundImage([
            {
              type: 'linear-gradient',
              direction,
              colorStops: [{ color: 'red' }, { color: 'blue' }],
            },
          ])
        ).toEqual([expect.objectContaining({ direction: expected })]);
      }
    );

    test('expands multiple color stop positions', () => {
      expect(
        processBackgroundImage([
          {
            type: 'linear-gradient',
            colorStops: [
              { color: 'red', positions: ['0%', '20%'] },
              { color: 'blue', positions: ['100%'] },
            ],
          },
        ])
      ).toEqual([
        expect.objectContaining({
          colorStops: [
            { color: RED, position: '0%' },
            { color: RED, position: '20%' },
            { color: BLUE, position: '100%' },
          ],
        }),
      ]);
    });

    test('processes transition hints', () => {
      expect(
        processBackgroundImage([
          {
            type: 'linear-gradient',
            colorStops: [
              { color: 'red' },
              { color: null, positions: ['30%'] },
              { color: 'blue' },
            ],
          },
        ])
      ).toEqual([
        expect.objectContaining({
          colorStops: [
            { color: RED, position: null },
            { color: null, position: '30%' },
            { color: BLUE, position: null },
          ],
        }),
      ]);
    });

    test('processes a radial gradient with default values', () => {
      expect(
        processBackgroundImage([
          {
            type: 'radial-gradient',
            colorStops: [{ color: 'red' }, { color: 'blue' }],
          },
        ])
      ).toEqual([
        {
          type: 'radial-gradient',
          shape: 'ellipse',
          size: 'farthest-corner',
          position: { top: '50%', left: '50%' },
          colorStops: [
            { color: RED, position: null },
            { color: BLUE, position: null },
          ],
        },
      ]);
    });

    test('processes a radial gradient with custom values', () => {
      expect(
        processBackgroundImage([
          {
            type: 'radial-gradient',
            shape: 'circle',
            size: { x: '50%', y: 100 },
            position: { bottom: '10%', right: 0 },
            colorStops: [{ color: 'red' }, { color: 'blue' }],
          },
        ])
      ).toEqual([
        expect.objectContaining({
          shape: 'circle',
          size: { x: '50%', y: 100 },
          position: { bottom: '10%', right: 0 },
        }),
      ]);
    });

    test.each([
      [{ type: 'linear-gradient', direction: 'diagonal', colorStops: [] }],
      [
        {
          type: 'linear-gradient',
          colorStops: [{ color: 'red', positions: ['10rem'] }],
        },
      ],
      [{ type: 'radial-gradient', shape: 'square', colorStops: [] }],
      [{ type: 'radial-gradient', size: 'huge', colorStops: [] }],
      [{ type: 'conic-gradient', colorStops: [] }],
    ] as unknown as [BackgroundImageValue][])(
      'throws for invalid input %j',
      (input) => {
        expect(() => processBackgroundImage([input])).toThrow();
      }
    );
  });
});
