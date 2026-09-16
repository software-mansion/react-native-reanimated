'use strict';
import type { ColorValue } from 'react-native';

import { processBackgroundImageWeb } from '../backgroundImage';

describe(processBackgroundImageWeb, () => {
  test('passes strings through unchanged', () => {
    const value = 'linear-gradient(45deg, red, blue)';
    expect(processBackgroundImageWeb(value)).toBe(value);
  });

  test('serializes a linear gradient without a direction', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'linear-gradient',
          colorStops: [{ color: 'red' }, { color: 'blue' }],
        },
      ])
    ).toBe('linear-gradient(red, blue)');
  });

  test('serializes a linear gradient with a direction and positions', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'linear-gradient',
          direction: 'to bottom right',
          colorStops: [
            { color: 'red', positions: ['0%', '20%'] },
            { color: 'blue', positions: ['100%'] },
          ],
        },
      ])
    ).toBe('linear-gradient(to bottom right, red 0% 20%, blue 100%)');
  });

  test('adds the px unit to numeric color stop positions', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'linear-gradient',
          colorStops: [
            { color: 'red', positions: [0, 20] },
            { color: null, positions: [50] },
            { color: 'blue', positions: ['80%', 100] },
          ],
        },
      ])
    ).toBe('linear-gradient(red 0px 20px, 50px, blue 80% 100px)');
  });

  test('serializes transition hints', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'linear-gradient',
          colorStops: [
            { color: 'red' },
            { color: null, positions: ['30%'] },
            { color: 'blue' },
          ],
        },
      ])
    ).toBe('linear-gradient(red, 30%, blue)');
  });

  test('serializes a radial gradient', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'radial-gradient',
          shape: 'ellipse',
          size: { x: 100, y: '50%' },
          position: { top: '10%', left: 20 },
          colorStops: [{ color: 'red' }, { color: 'blue' }],
        },
      ])
    ).toBe(
      'radial-gradient(ellipse 100px 50% at left 20px top 10%, red, blue)'
    );
  });

  test('serializes a radial gradient with keyword shape and size', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: 'closest-side',
          colorStops: [{ color: 'red' }, { color: 'blue' }],
        },
      ])
    ).toBe('radial-gradient(circle closest-side, red, blue)');
  });

  test.each([
    [{ top: '10%' }, 'at left 50% top 10%'],
    [{ left: '10%' }, 'at left 10% top 50%'],
    [{ bottom: '10%' }, 'at left 50% bottom 10%'],
    [{ right: 20 }, 'at right 20px top 50%'],
    [{ bottom: '10%', right: 20 }, 'at right 20px bottom 10%'],
    // Native prefers left over right and top over bottom
    [{ left: 10, right: 20, top: 30, bottom: 40 }, 'at left 10px top 30px'],
    [{}, ''],
  ])(
    'serializes the partial radial gradient position %j with both axes',
    (position, expected) => {
      expect(
        processBackgroundImageWeb([
          {
            type: 'radial-gradient',
            position,
            colorStops: [{ color: 'red' }, { color: 'blue' }],
          },
        ])
      ).toBe(`radial-gradient(${expected ? `${expected}, ` : ''}red, blue)`);
    }
  );

  test.each([
    [{ x: 100, y: 100 }, 'circle 100px'],
    [{ x: 100, y: 50 }, 'circle 100px'], // max(x, y)
    [{ x: '100px', y: '50px' }, 'circle 100px'],
    [{ x: '100', y: '100' }, 'circle 100px'],
    [{ x: '50%', y: '50%' }, '50% 50%'], // no CSS spelling, degrades to an ellipse
    [{ x: '50%', y: 100 }, '50% 100px'],
  ])('serializes the circle size %j as %s', (size, expected) => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'radial-gradient',
          shape: 'circle',
          size,
          colorStops: [{ color: 'red' }, { color: 'blue' }],
        },
      ])
    ).toBe(`radial-gradient(${expected}, red, blue)`);
  });

  test('serializes multiple gradients', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'linear-gradient',
          colorStops: [{ color: 'red' }, { color: 'blue' }],
        },
        {
          type: 'radial-gradient',
          size: { x: 100, y: 50 },
          colorStops: [{ color: 'green' }, { color: 'blue' }],
        },
      ])
    ).toBe(
      'linear-gradient(red, blue), radial-gradient(100px 50px, green, blue)'
    );
  });

  test('converts number colors to rgba strings', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'linear-gradient',
          colorStops: [{ color: 0xff0000ff }, { color: 0x0000ffff }],
        },
      ])
    ).toBe('linear-gradient(rgba(255, 0, 0, 1), rgba(0, 0, 255, 1))');
  });

  test.each([
    [
      'without a position',
      [{ color: 'red' }, { color: null }, { color: 'blue' }],
    ],
    [
      'with two positions',
      [
        { color: 'red' },
        { color: null, positions: ['20%', '40%'] },
        { color: 'blue' },
      ],
    ],
    [
      'first',
      [
        { color: null, positions: ['20%'] },
        { color: 'red' },
        { color: 'blue' },
      ],
    ],
    [
      'last',
      [
        { color: 'red' },
        { color: 'blue' },
        { color: null, positions: ['80%'] },
      ],
    ],
    [
      'next to another hint',
      [
        { color: 'red' },
        { color: null, positions: ['20%'] },
        { color: null, positions: ['40%'] },
        { color: 'blue' },
      ],
    ],
  ])('drops the value when a transition hint is %s', (_, colorStops) => {
    expect(
      processBackgroundImageWeb([{ type: 'linear-gradient', colorStops }])
    ).toBeUndefined();
  });

  test('drops the value when a color stop has an object color', () => {
    const platformColor = { semantic: ['systemRed'] } as unknown as ColorValue;

    expect(
      processBackgroundImageWeb([
        {
          type: 'linear-gradient',
          colorStops: [{ color: platformColor }, { color: 'blue' }],
        },
      ])
    ).toBeUndefined();
  });
});
