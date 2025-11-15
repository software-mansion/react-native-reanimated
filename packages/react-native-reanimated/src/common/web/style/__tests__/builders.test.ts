'use strict';
import { boxShadowBuilder, textShadowBuilder } from '../builders/shadows';
import {
  processTransform,
  processTransformOrigin,
} from '../builders/transforms';

describe(processTransform, () => {
  test('returns string when already a string', () => {
    expect(processTransform('scale(1.2) translateX(10px)')).toBe(
      'scale(1.2) translateX(10px)'
    );
  });

  test('builds transform string from array', () => {
    expect(
      processTransform([
        { translateX: 10 },
        { translateY: 5 },
        { scale: 2 },
        { matrix: ['a', 'b', 'c', 'd', 'e', 'f'] as unknown as number[] },
      ])
    ).toBe('translateX(10px) translateY(5px) scale(2) matrix3d(a,b,c,d,e,f)');
  });
});

describe(processTransformOrigin, () => {
  test('returns string as is', () => {
    expect(processTransformOrigin('50% 50%')).toBe('50% 50%');
  });

  test('converts numeric array values to px string', () => {
    expect(processTransformOrigin([10, '25%', 0])).toBe('10px 25% 0px');
  });
});

describe('boxShadowBuilder', () => {
  test('builds box shadow string with opacity and radius', () => {
    boxShadowBuilder.add('shadowColor', 'rgba(255, 0, 0, 1)');
    boxShadowBuilder.add('shadowOffset', { width: 4, height: 6 });
    boxShadowBuilder.add('shadowOpacity', 0.5);
    boxShadowBuilder.add('shadowRadius', 10);

    expect(boxShadowBuilder.build()).toEqual({
      boxShadow: '4px 6px 10px rgba(255, 0, 0, 0.5)',
    });
  });
});

describe('textShadowBuilder', () => {
  test('builds text shadow string', () => {
    textShadowBuilder.add('textShadowColor', 'black');
    textShadowBuilder.add('textShadowOffset', { width: 1, height: 2 });
    textShadowBuilder.add('textShadowRadius', 4);

    expect(textShadowBuilder.build()).toEqual({
      textShadow: '1px 2px 4px black',
    });
  });
});
