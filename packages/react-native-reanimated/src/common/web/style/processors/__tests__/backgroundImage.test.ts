'use strict';
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
      'radial-gradient(ellipse 100px 50% at top 10% left 20px, red, blue)'
    );
  });

  test('serializes a circle size as a single radius', () => {
    expect(
      processBackgroundImageWeb([
        {
          type: 'radial-gradient',
          shape: 'circle',
          size: { x: 100, y: 100 },
          colorStops: [{ color: 'red' }, { color: 'blue' }],
        },
      ])
    ).toBe('radial-gradient(circle 100px, red, blue)');
  });

  test.each([
    [{ x: 100, y: 50 }], // unequal axes cannot describe a circle
    [{ x: '50%', y: '50%' }], // a circle radius cannot be a percentage
  ])('throws for an invalid circle size %j', (size) => {
    expect(() =>
      processBackgroundImageWeb([
        {
          type: 'radial-gradient',
          shape: 'circle',
          size,
          colorStops: [{ color: 'red' }, { color: 'blue' }],
        },
      ])
    ).toThrow();
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
          size: 'closest-side',
          colorStops: [{ color: 'green' }, { color: 'blue' }],
        },
      ])
    ).toBe(
      'linear-gradient(red, blue), radial-gradient(closest-side, green, blue)'
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
});
