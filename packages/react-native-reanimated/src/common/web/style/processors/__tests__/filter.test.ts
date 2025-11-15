'use strict';
import type { DropShadowValue } from 'react-native';

import { processFilterWeb } from '../filter';

describe(processFilterWeb, () => {
  test('returns string unchanged', () => {
    expect(processFilterWeb('blur(5px)')).toBe('blur(5px)');
  });

  test('builds filter string from array', () => {
    const dropShadow: DropShadowValue = {
      offsetX: 2,
      offsetY: 4,
      standardDeviation: 3,
      color: 'black',
    };

    expect(
      processFilterWeb([
        { blur: 4 },
        { brightness: 0.5 },
        { hueRotate: 45 },
        { dropShadow },
      ])
    ).toBe(
      'blur(4px) brightness(0.5) hue-rotate(45deg) drop-shadow(2px 4px 3px black)'
    );
  });
});
