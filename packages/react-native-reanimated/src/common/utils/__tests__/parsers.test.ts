'use strict';
import { getAngleInDegrees, parseBoxShadowString } from '../parsers';

describe(parseBoxShadowString, () => {
  test('returns empty array for none', () => {
    expect(parseBoxShadowString('none')).toEqual([]);
  });

  test('parses single shadow variants', () => {
    expect(parseBoxShadowString('10px 5px #000')).toEqual([
      {
        offsetX: '10px',
        offsetY: '5px',
        color: '#000',
      },
    ]);

    expect(parseBoxShadowString('10px 5px 15px 2px rgba(0,0,0,0.5)')).toEqual([
      {
        offsetX: '10px',
        offsetY: '5px',
        blurRadius: '15px',
        spreadDistance: '2px',
        color: 'rgba(0,0,0,0.5)',
      },
    ]);

    expect(parseBoxShadowString('inset 5px 10px blue')).toEqual([
      {
        offsetX: '5px',
        offsetY: '10px',
        color: 'blue',
        inset: true,
      },
    ]);
  });

  test('parses multiple shadows', () => {
    expect(parseBoxShadowString('5px 5px red, 10px 10px 3px green')).toEqual([
      {
        offsetX: '5px',
        offsetY: '5px',
        color: 'red',
      },
      {
        offsetX: '10px',
        offsetY: '10px',
        blurRadius: '3px',
        color: 'green',
      },
    ]);
  });
});

describe(getAngleInDegrees, () => {
  test.each([
    ['45deg', 45],
    ['-45deg', -45],
    ['+45deg', 45],
    ['.5deg', 0.5],
    ['100grad', 90],
    ['1rad', 180 / Math.PI],
    ['0.5turn', 180],
    ['45DEG', 45],
    ['100Grad', 90],
    ['0.5TURN', 180],
    ['1.5907e-12deg', 1.5907e-12],
    ['-2.5e2deg', -250],
    ['1E2grad', 90],
  ])('converts %s to %p', (input, expected) => {
    expect(getAngleInDegrees(input)).toBe(expected);
  });

  test.each(['45', '45px', 'deg', '', ' 45deg', '45deg ', '45 deg', 'abc'])(
    'returns null for %p',
    (input) => {
      expect(getAngleInDegrees(input)).toBeNull();
    }
  );
});
