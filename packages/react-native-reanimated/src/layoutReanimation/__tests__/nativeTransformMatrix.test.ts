'use strict';

import {
  composeLayoutFlipMatrix,
  type NativeTransformMatrix,
  resolveReactNativeTransformMatrix,
} from '../nativeTransformMatrix';

const identity: NativeTransformMatrix = [
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
];

function expectMatrixClose(
  actual: NativeTransformMatrix | null,
  expected: NativeTransformMatrix
) {
  expect(actual).not.toBeNull();
  actual?.forEach((value, index) => {
    expect(value).toBeCloseTo(expected[index]);
  });
}

describe('native transform matrix lowering', () => {
  test('preserves React Native operation order', () => {
    const translateThenRotate = resolveReactNativeTransformMatrix(
      [{ translateX: 100 }, { rotate: '90deg' }],
      100,
      100
    );
    const rotateThenTranslate = resolveReactNativeTransformMatrix(
      [{ rotate: '90deg' }, { translateX: 100 }],
      100,
      100
    );

    expect(translateThenRotate).not.toEqual(rotateThenTranslate);
    expectMatrixClose(
      translateThenRotate,
      [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 100, 0, 0, 1]
    );
    expectMatrixClose(
      rotateThenTranslate,
      [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 100, 0, 1]
    );
  });

  test('preserves duplicate operations', () => {
    expect(
      resolveReactNativeTransformMatrix(
        [{ translateX: 20 }, { translateX: 30 }],
        100,
        100
      )
    ).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 50, 0, 0, 1]);
  });

  test('matches React Native transform-origin resolution', () => {
    expect(
      resolveReactNativeTransformMatrix(
        [{ scaleX: 2 }, { scaleY: 1.5 }],
        100,
        200,
        [25, 50]
      )
    ).toEqual([2, 0, 0, 0, 0, 1.5, 0, 0, 0, 0, 1, 0, 25, 25, 0, 1]);
  });

  test('supports skew, perspective, and a supplied matrix', () => {
    const matrix = resolveReactNativeTransformMatrix(
      [{ skewX: '45deg' }, { skewY: '45deg' }, { perspective: 500 }],
      100,
      100
    );
    expect(matrix?.[4]).toBeCloseTo(1);
    expect(matrix?.[1]).toBeCloseTo(1);
    expect(matrix?.[11]).toBeCloseTo(-1 / 500);
    expect(
      resolveReactNativeTransformMatrix([{ matrix: identity }], 100, 100)
    ).toEqual(identity);
  });

  test('composes final-state-first FLIP without changing final geometry', () => {
    const result = composeLayoutFlipMatrix(
      { originX: 10, originY: 20, width: 100, height: 50 },
      { originX: 100, originY: 200, width: 200, height: 100 },
      identity
    );

    expect(result).toEqual([
      0.5, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 1, 0, -140, -205, 0, 1,
    ]);
    expect(
      composeLayoutFlipMatrix(
        { originX: 100, originY: 200, width: 200, height: 100 },
        { originX: 100, originY: 200, width: 200, height: 100 },
        identity
      )
    ).toEqual(identity);
  });

  test('rejects a zero-sized final rectangle without producing infinities', () => {
    expect(
      composeLayoutFlipMatrix(
        { originX: 0, originY: 0, width: 10, height: 10 },
        { originX: 0, originY: 0, width: 0, height: 10 },
        identity
      )
    ).toBeNull();
  });
});
