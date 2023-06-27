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

const identityMatrix: AffiniteMatrix = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

const flatIdentityMatrix: AffiniteMatrixFlat = [
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
];

const consecutiveNumMatrix: AffiniteMatrix = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
];

describe('Matrix multiplication', () => {
  it('Multiply some 4x4 matrices', () => {
    expect(multiplyMatrices(identityMatrix, identityMatrix)).toEqual(
      identityMatrix
    );

    expect(multiplyMatrices(identityMatrix, consecutiveNumMatrix)).toEqual(
      consecutiveNumMatrix
    );

    expect(multiplyMatrices(consecutiveNumMatrix, identityMatrix)).toEqual(
      consecutiveNumMatrix
    );

    expect(
      multiplyMatrices(consecutiveNumMatrix, consecutiveNumMatrix)
    ).toEqual([
      [90, 100, 110, 120],
      [202, 228, 254, 280],
      [314, 356, 398, 440],
      [426, 484, 542, 600],
    ]);
  });
});

describe('Flatten & unflatten', () => {
  it('Test flatten', () => {
    expect(flatten(identityMatrix)).toEqual(flatIdentityMatrix);
    // @ts-ignore I know this is not the correct way to call this function, but I'm testing that it still works
    expect(flatten(flatten(identityMatrix))).toEqual(flatIdentityMatrix);
  });
  it('Test unflatten', () => {
    expect(unflatten(flatIdentityMatrix)).toEqual(identityMatrix);
  });
  it('Test compositions of flatten & unflatten', () => {
    expect(unflatten(flatten(identityMatrix))).toEqual(identityMatrix);
    expect(flatten(unflatten(flatIdentityMatrix))).toEqual(flatIdentityMatrix);
  });
});

describe('Type assertions:', () => {
  it('isAffiniteMatrix', () => {
    expect(isAffiniteMatrix(identityMatrix)).toEqual(true);

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
  });
  it('isAffiniteMatrixFlat', () => {
    expect(isAffiniteMatrixFlat(flatIdentityMatrix)).toEqual(true);
    expect(isAffiniteMatrixFlat([1, 0, 0, 0, 0, 1])).toEqual(false);
    expect(
      isAffiniteMatrixFlat([1, 0, null, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
    ).toEqual(false);
  });
});

describe('Matrix calculations: ', () => {
  const a = consecutiveNumMatrix;
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
  it('Throw an error if matrix is incorrect (has zero as its last element)', () => {
    const incorrectMatrix: AffiniteMatrix = [
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 0],
    ];
    expect(() => decomposeMatrix(incorrectMatrix)).toThrowError(
      new Error('Invalid transform matrix!')
    );
  });

  it('Decompose identity into identities', () => {
    const { translationMatrix, scaleMatrix, rotationMatrix, skewMatrix } =
      decomposeMatrix(flatten(identityMatrix));

    expect(translationMatrix).toEqual(identityMatrix);
    expect(scaleMatrix).toEqual(identityMatrix);
    expect(rotationMatrix).toEqual(identityMatrix);
    expect(skewMatrix).toEqual(identityMatrix);
  });

  it('Decompose random matrix ', () => {
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
