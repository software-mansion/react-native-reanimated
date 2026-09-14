'use strict';
import type { DropShadowValue } from 'react-native';

import { processFilterWeb } from '../filter';

describe(processFilterWeb, () => {
  test.each([
    ['blur(5px)', 'blur(5px)'],
    ['hue-rotate(45deg)', 'hue-rotate(45deg)'],
    ['hueRotate(45deg)', 'hue-rotate(45deg)'],
    ['drop-shadow(2px 4px blue)', 'drop-shadow(2px 4px blue)'],
    ['dropShadow(2px 4px blue)', 'drop-shadow(2px 4px blue)'],
  ])('normalizes string input %s', (input, expected) => {
    expect(processFilterWeb(input)).toBe(expected);
  });

  test('builds basic filter string from array', () => {
    expect(
      processFilterWeb([{ blur: 4 }, { brightness: 0.5 }, { hueRotate: 45 }])
    ).toBe('blur(4px) brightness(0.5) hue-rotate(45deg)');
  });

  test('builds drop-shadow entry from object', () => {
    const dropShadow: DropShadowValue = {
      offsetX: 2,
      offsetY: 4,
      standardDeviation: 3,
      color: 'black',
    };

    expect(processFilterWeb([{ dropShadow }])).toBe(
      'drop-shadow(2px 4px 3px black)'
    );
  });

  test('supports drop-shadow string input', () => {
    expect(processFilterWeb([{ dropShadow: '2px 4px blue' }])).toBe(
      'drop-shadow(2px 4px blue)'
    );
  });

  test('adds default suffixes when missing', () => {
    expect(processFilterWeb([{ blur: 3 }, { hueRotate: 90 }])).toBe(
      'blur(3px) hue-rotate(90deg)'
    );
  });
});
