'use strict';
import type { DropShadowValue } from 'react-native';

import { processColor } from '../processors/colors';
import { processFilterWeb } from '../processors/filter';
import { processFontVariant, processFontWeight } from '../processors/font';
import {
  processMarginHorizontal,
  processMarginVertical,
} from '../processors/margins';
import {
  processPaddingHorizontal,
  processPaddingVertical,
} from '../processors/paddings';
import { processBoxShadowWeb } from '../processors/shadows';
import { parseDimensionValue } from '../utils';

describe(processColor, () => {
  test('converts numeric color to rgba string', () => {
    expect(processColor(0xff0000ff)).toBe('rgba(255, 0, 0, 1)');
  });

  test('normalizes hwb spacing', () => {
    expect(processColor('hwb(0, 0%, 0%)')).toBe('hwb(0 0% 0%)');
  });

  test('returns original string for other formats', () => {
    expect(processColor('#123456')).toBe('#123456');
  });
});

describe(processFontWeight, () => {
  test.each([
    [400, '400'],
    ['400', '400'],
    ['bold', '700'],
  ])('normalizes %p to %p', (input, expected) => {
    expect(processFontWeight(input)).toBe(expected);
  });

  test('returns undefined for unsupported values', () => {
    expect(processFontWeight('unknown')).toBeUndefined();
  });
});

describe(processFontVariant, () => {
  test('joins array values into comma separated string', () => {
    expect(processFontVariant(['small-caps', 'lining-nums'])).toBe(
      'small-caps, lining-nums'
    );
  });
});

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

describe(processBoxShadowWeb, () => {
  test('converts string input to CSS box-shadow', () => {
    expect(processBoxShadowWeb('10px 5px 4px red')).toBe('10px 5px 4px red');
  });

  test('handles array input', () => {
    expect(
      processBoxShadowWeb([
        { offsetX: 1, offsetY: 2, blurRadius: 3, color: 'blue' },
        { offsetX: '4px', offsetY: '5px', inset: true },
      ])
    ).toBe('1px 2px 3px blue, 4px 5px #000 inset');
  });
});

describe(processMarginHorizontal, () => {
  test('returns parsed dimension for both horizontal margins', () => {
    expect(processMarginHorizontal(10)).toEqual({
      marginLeft: '10px',
      marginRight: '10px',
    });
  });
});

describe(processMarginVertical, () => {
  test('returns parsed dimension for both vertical margins', () => {
    expect(processMarginVertical('5%')).toEqual({
      marginTop: '5%',
      marginBottom: '5%',
    });
  });
});

describe(processPaddingHorizontal, () => {
  test('returns parsed dimension for both horizontal paddings', () => {
    expect(processPaddingHorizontal(8)).toEqual({
      paddingLeft: '8px',
      paddingRight: '8px',
    });
  });
});

describe(processPaddingVertical, () => {
  test('returns parsed dimension for both vertical paddings', () => {
    expect(processPaddingVertical('2em')).toEqual({
      paddingTop: '2em',
      paddingBottom: '2em',
    });
  });
});

describe(parseDimensionValue, () => {
  test('returns undefined for object values', () => {
    expect(parseDimensionValue({} as never)).toBeUndefined();
  });

  test('returns string values unchanged', () => {
    expect(parseDimensionValue('10%')).toBe('10%');
  });

  test('appends px suffix for numbers', () => {
    expect(parseDimensionValue(4)).toBe('4px');
  });
});
