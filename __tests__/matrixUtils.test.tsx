import {
  AffineMatrix,
  AffineMatrixFlat,
  addMatrices,
  decomposeMatrix,
  flatten,
  isAffineMatrix,
  isAffineMatrixFlat,
  multiplyMatrices,
  subtractMatrices,
  unflatten,
} from '../src/reanimated2/animation/transformationMatrix/matrixUtils';

const identityMatrix: AffineMatrix = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

const flatIdentityMatrix: AffineMatrixFlat = [
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
];

const consecutiveNumMatrix: AffineMatrix = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
];

describe('Matrix util functions', () => {
  describe('Matrix multiplication', () => {
    it('Multiply two identity matrices', () => {
      expect(multiplyMatrices(identityMatrix, identityMatrix)).toEqual(
        identityMatrix
      );
    });
    it('Multiply arbitrary matrix by identity matrix', () => {
      expect(multiplyMatrices(identityMatrix, consecutiveNumMatrix)).toEqual(
        consecutiveNumMatrix
      );

      expect(multiplyMatrices(consecutiveNumMatrix, identityMatrix)).toEqual(
        consecutiveNumMatrix
      );
    });

    it('Multiply two arbitrary matrices', () => {
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

  it('Test flatten & unflatten functions', () => {
    expect(flatten(identityMatrix)).toEqual(flatIdentityMatrix);
    // @ts-expect-error I know this is not the correct way to call this function, but I'm testing that it still works
    expect(flatten(flatten(identityMatrix))).toEqual(flatIdentityMatrix);
    expect(unflatten(flatIdentityMatrix)).toEqual(identityMatrix);
    expect(unflatten(flatten(identityMatrix))).toEqual(identityMatrix);
    expect(flatten(unflatten(flatIdentityMatrix))).toEqual(flatIdentityMatrix);
  });

  describe('Type assertions:', () => {
    describe('Test isAffineMatrix function', () => {
      it('Return true if given argument is a valid affine matrix', () => {
        expect(isAffineMatrix(identityMatrix)).toEqual(true);
      });

      it('Return false if given matrix has incorrect shape', () => {
        expect(
          isAffineMatrix([
            [1, 2, 3],
            [1, 2, 3],
            [1, 2, 3],
          ])
        ).toEqual(false);
      });

      it('Return false if given matrix contains null or NaN', () => {
        expect(
          isAffineMatrix([
            [1, 0, 0, 0],
            [0, 1, 0, null],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
          ])
        ).toEqual(false);

        expect(
          isAffineMatrix([
            [1, 0, 0, 0],
            [0, 1, 0, NaN],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
          ])
        ).toEqual(false);
      });
    });

    describe('Test isAffineMatrixFlat function ', () => {
      it('Return true if given argument is has valid type', () => {
        expect(isAffineMatrixFlat(flatIdentityMatrix)).toEqual(true);
      });

      it('Return false if given matrix has incorrect number of elements', () => {
        expect(isAffineMatrixFlat([1, 0, 0, 0, 0, 1])).toEqual(false);
      });

      it('Return false if given matrix contains null or NaN', () => {
        expect(
          isAffineMatrixFlat([
            1,
            0,
            null,
            0,
            0,
            1,
            0,
            0,
            0,
            0,
            1,
            0,
            0,
            0,
            0,
            1,
          ])
        ).toEqual(false);
      });
    });
  });

  describe('Matrix calculations: ', () => {
    const a = consecutiveNumMatrix;
    const b: AffineMatrix = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ];
    const aMinusB: AffineMatrix = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [8, 9, 10, 11],
      [12, 13, 14, 15],
    ];
    const aPlusB: AffineMatrix = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [10, 11, 12, 13],
      [14, 15, 16, 17],
    ];

    it('subtract matrices', () => {
      expect(subtractMatrices(a, b)).toEqual(aMinusB);
      expect(subtractMatrices(flatten(a), flatten(b))).toEqual(
        flatten(aMinusB)
      );
    });

    it('add matrices', () => {
      expect(addMatrices(a, b)).toEqual(aPlusB);
      expect(addMatrices(flatten(a), flatten(b))).toEqual(flatten(aPlusB));
    });
  });

  describe('Matrix decomposition', () => {
    it('Throw an error if matrix is incorrect (has zero as its last element)', () => {
      const incorrectMatrix: AffineMatrix = [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 0],
      ];
      expect(() => decomposeMatrix(incorrectMatrix)).toThrowError();
    });

    it('Decompose identity into identities', () => {
      const { translationMatrix, scaleMatrix, rotationMatrix, skewMatrix } =
        decomposeMatrix(flatten(identityMatrix));

      expect(translationMatrix).toEqual(identityMatrix);
      expect(scaleMatrix).toEqual(identityMatrix);
      expect(rotationMatrix).toEqual(identityMatrix);
      expect(skewMatrix).toEqual(identityMatrix);
    });

    it('Decompose arbitrary matrix ', () => {
      const m2: AffineMatrixFlat = [
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
});
