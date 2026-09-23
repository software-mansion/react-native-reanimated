'use strict';
import type { ColorValue, ViewStyle } from 'react-native';

import { processBackgroundImageWeb } from '../backgroundImage';

type BackgroundImageLayer = Exclude<
  NonNullable<ViewStyle['backgroundImage']>,
  string
>[number];

describe(processBackgroundImageWeb, () => {
  test('passes string input through', () => {
    expect(
      processBackgroundImageWeb('linear-gradient(to right, red 10%, blue)')
    ).toBe('linear-gradient(to right, red 10%, blue)');
  });

  test('converts a linear gradient object', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'linear-gradient',
          direction: '45deg',
          colorStops: [
            { color: 'red', positions: ['0%'] },
            { color: null, positions: ['30%'] },
            {
              color: 0xff0000ff as unknown as ColorValue,
              positions: ['50%', '80%'],
            },
            { color: 'blue' },
          ],
        },
      ])
    ).toBe(
      'linear-gradient(45deg, red 0%, 30%, rgba(255, 0, 0, 1) 50% 80%, blue)'
    );
  });

  test('defaults a linear gradient direction to bottom', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'linear-gradient',
          colorStops: [{ color: 'red' }, { color: 'blue' }],
        },
      ])
    ).toBe('linear-gradient(to bottom, red, blue)');
  });

  test('converts a radial gradient object with keyword size', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: 'farthest-side',
          position: { top: '50%', left: 20 },
          colorStops: [
            { color: 'white' },
            { color: 'black', positions: ['70%'] },
          ],
        },
      ])
    ).toBe(
      'radial-gradient(circle farthest-side at top 50% left 20px, white, black 70%)'
    );
  });

  test('converts a radial gradient object with explicit size', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'radial-gradient',
          shape: 'ellipse',
          size: { x: 40, y: '20%' },
          position: { bottom: 10, right: '5%' },
          colorStops: [{ color: 'red' }, { color: 'blue' }],
        },
      ])
    ).toBe(
      'radial-gradient(ellipse 40px 20% at bottom 10px right 5%, red, blue)'
    );
  });

  test('emits the larger radius for an explicit circle size', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: { x: 40, y: 80 },
          position: { top: '50%', left: '50%' },
          colorStops: [{ color: 'red' }, { color: 'blue' }],
        },
      ])
    ).toBe('radial-gradient(circle 80px at top 50% left 50%, red, blue)');
  });

  test('emits an ellipse for a circle with percentage size', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: { x: '50%', y: 20 },
          position: { top: '50%', left: '50%' },
          colorStops: [{ color: 'red' }, { color: 'blue' }],
        },
      ])
    ).toBe('radial-gradient(ellipse 50% 20px at top 50% left 50%, red, blue)');
  });

  test('adds px to numeric stop positions', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'linear-gradient',
          direction: 'to right',
          colorStops: [
            { color: 'red', positions: [10 as unknown as string] },
            { color: null, positions: [20 as unknown as string] },
            { color: 'blue', positions: ['50%'] },
          ],
        },
      ])
    ).toBe('linear-gradient(to right, red 10px, 20px, blue 50%)');
  });

  test('defaults radial shape, size and position', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'radial-gradient',
          colorStops: [{ color: 'red' }, { color: 'blue' }],
        } as unknown as BackgroundImageLayer,
      ])
    ).toBe(
      'radial-gradient(ellipse farthest-corner at top 50% left 50%, red, blue)'
    );
  });

  test('joins multiple layers', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'linear-gradient',
          direction: 'to right',
          colorStops: [{ color: 'red' }, { color: 'blue' }],
        },
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: 'closest-corner',
          position: { top: '50%', left: '50%' },
          colorStops: [{ color: 'white' }, { color: 'black' }],
        },
      ])
    ).toBe(
      'linear-gradient(to right, red, blue), radial-gradient(circle closest-corner at top 50% left 50%, white, black)'
    );
  });
});
