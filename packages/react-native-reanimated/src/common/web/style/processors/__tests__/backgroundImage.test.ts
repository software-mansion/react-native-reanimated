'use strict';
import { processBackgroundImageWeb } from '../backgroundImage';

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
            { color: 0xff0000ff, positions: ['50%', '80%'] },
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
