'use strict';
import { processTransform, processTransformOrigin } from '../transforms';

describe(processTransform, () => {
  test('returns string unchanged', () => {
    expect(processTransform('rotate(45deg) scale(2)')).toBe(
      'rotate(45deg) scale(2)'
    );
  });

  test('returns undefined for undefined input', () => {
    expect(processTransform(undefined as never)).toBeUndefined();
  });

  test('builds transform from array of transform objects', () => {
    const transforms = [{ rotate: '45deg' }, { scale: 2 }, { translateX: 10 }];

    expect(processTransform(transforms)).toBe(
      'rotate(45deg) scale(2) translateX(10px)'
    );
  });

  test('applies name alias for matrix to matrix3d', () => {
    const transforms = [
      { matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
    ];

    expect(processTransform(transforms)).toBe(
      'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)'
    );
  });

  test('handles perspective with px suffix', () => {
    const transforms = [{ perspective: 100 }];

    expect(processTransform(transforms)).toBe('perspective(100px)');
  });

  test('handles multiple transform types', () => {
    const transforms = [
      { rotateX: '30deg' },
      { rotateY: '45deg' },
      { rotateZ: '90deg' },
      { scaleX: 1.5 },
      { scaleY: 0.8 },
      { skewX: '10deg' },
      { skewY: '5deg' },
      { translateY: 20 },
    ];

    expect(processTransform(transforms)).toBe(
      'rotateX(30deg) rotateY(45deg) rotateZ(90deg) scaleX(1.5) scaleY(0.8) skewX(10deg) skewY(5deg) translateY(20px)'
    );
  });
});

describe(processTransformOrigin, () => {
  test('returns string unchanged', () => {
    expect(processTransformOrigin('center')).toBe('center');
  });

  test('converts number array to string with px suffix', () => {
    expect(processTransformOrigin([10, 20])).toBe('10px 20px');
  });

  test('handles mixed string and number array', () => {
    expect(processTransformOrigin([10, 'center', 5])).toBe('10px center 5px');
  });
});
