'use strict';
import { parseBoxShadowString } from '../parsers';

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
