import {
  AffiniteMatrix,
  AffiniteMatrixFlat,
  addMatrices,
  decomposeMatrix,
  flatten,
  isAffiniteMatrix,
  isAffiniteMatrixFlat,
  multiplyMatrices,
  subtractMatrices,
  unflatten,
} from '../matrixUtils';

describe('Matrix multiplication', () => {
  it('Multiply some 4x4 matrices', () => {
    const identityMatrix: AffiniteMatrix = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];

    const consequitiveNumMatrix: AffiniteMatrix = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ];
    expect(multiplyMatrices(identityMatrix, consequitiveNumMatrix)).toEqual(
      consequitiveNumMatrix
    );

    expect(
      multiplyMatrices(consequitiveNumMatrix, consequitiveNumMatrix)
    ).toEqual([
      [90, 100, 110, 120],
      [202, 228, 254, 280],
      [314, 356, 398, 440],
      [426, 484, 542, 600],
    ]);
  });
});

describe('Flatten & unflatten', () => {
  it('Test that both helpers are work and flatten is idempotent', () => {
    const identityMatrix: AffiniteMatrix = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    const flatMatrix: AffiniteMatrixFlat = [
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ];

    expect(flatten(identityMatrix)).toEqual(flatMatrix);
    expect(unflatten(flatMatrix)).toEqual(identityMatrix);
    // @ts-ignore I know this is not the correct way to call this function, but I'm testing that it still works
    expect(flatten(flatten(identityMatrix))).toEqual(flatMatrix);

    expect(unflatten(flatten(identityMatrix))).toEqual(identityMatrix);
    expect(flatten(unflatten(flatMatrix))).toEqual(flatMatrix);
  });
});

describe('Type assertions: isAffiniteMatrix & isAffiniteMatrixFlat', () => {
  it('Test both correct and incorrect cases', () => {
    const identityMatrix: AffiniteMatrix = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    const flatMatrix: AffiniteMatrixFlat = [
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1.77,
    ];

    expect(isAffiniteMatrix(identityMatrix)).toEqual(true);
    expect(isAffiniteMatrixFlat(flatMatrix)).toEqual(true);

    expect(
      isAffiniteMatrix([
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
      ])
    ).toEqual(false);

    expect(
      isAffiniteMatrix([
        [1, 0, 0, 0],
        [0, 1, 0, null],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ])
    ).toEqual(false);

    expect(isAffiniteMatrixFlat([1, 0, 0, 0, 0, 1])).toEqual(false);

    expect(
      isAffiniteMatrixFlat([1, 0, null, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
    ).toEqual(false);
  });
});

describe('Matrix calculations', () => {
  const a: AffiniteMatrix = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ];
  const b: AffiniteMatrix = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
  ];
  const aMinusB: AffiniteMatrix = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [8, 9, 10, 11],
    [12, 13, 14, 15],
  ];

  const aPlusB: AffiniteMatrix = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [10, 11, 12, 13],
    [14, 15, 16, 17],
  ];

  it('subtract matrices', () => {
    expect(subtractMatrices(a, b)).toEqual(aMinusB);
    expect(subtractMatrices(flatten(a), flatten(b))).toEqual(flatten(aMinusB));
  });

  it('add matrices', () => {
    expect(addMatrices(a, b)).toEqual(aPlusB);
    expect(addMatrices(flatten(a), flatten(b))).toEqual(flatten(aPlusB));
  });
});

describe('Matrix decomposition', () => {
  it('Decompose identity into identities', () => {
    const identityMatrix: AffiniteMatrix = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];

    const { translationMatrix, scaleMatrix, rotationMatrix, skewMatrix } =
      decomposeMatrix(flatten(identityMatrix));

    expect(translationMatrix).toEqual(identityMatrix);
    expect(scaleMatrix).toEqual(identityMatrix);
    expect(rotationMatrix).toEqual(identityMatrix);
    expect(skewMatrix).toEqual(identityMatrix);
  });

  it('Decompose any matrix ', () => {
    const m2: AffiniteMatrixFlat = [
      1, 2, 3, 0, 1, 1, 1, 0, 1, 2, 0, 0, 4, 5, 6, 1,
    ];

    const { translationMatrix, scaleMatrix, rotationMatrix, skewMatrix } =
      decomposeMatrix(m2);

    flatten(
      multiplyMatrices(
        multiplyMatrices(
          scaleMatrix,
          multiplyMatrices(skewMatrix, rotationMatrix)
        ),
        translationMatrix
      )
    ).forEach((v, i) => expect(v).toBeCloseTo(m2[i]));
  });
});
