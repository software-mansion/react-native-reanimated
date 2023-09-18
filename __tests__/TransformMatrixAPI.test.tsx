import { TransformMatrix } from '../src/reanimated2/animation/transformationMatrix/TransformMatrix';

const identityMatrix = TransformMatrix.getIdentityMatrix();

const consecutiveNumMatrix = [
  ...[1, 2, 3, 4],
  ...[5, 6, 7, 8],
  ...[9, 10, 11, 12],
  ...[13, 14, 15, 16],
];

describe('Matrix util functions', () => {
  describe('Matrix multiplication', () => {
    it('Multiply two identity matrices', () => {
      expect(
        TransformMatrix.multiplyMatrices(identityMatrix, identityMatrix)
      ).toEqual(identityMatrix);
    });
    it('Multiply arbitrary matrix by identity matrix', () => {
      expect(
        TransformMatrix.multiplyMatrices(identityMatrix, consecutiveNumMatrix)
      ).toEqual(consecutiveNumMatrix);

      expect(
        TransformMatrix.multiplyMatrices(consecutiveNumMatrix, identityMatrix)
      ).toEqual(consecutiveNumMatrix);
    });

    it('Multiply two arbitrary matrices', () => {
      expect(
        TransformMatrix.multiplyMatrices(
          consecutiveNumMatrix,
          consecutiveNumMatrix
        )
      ).toEqual([
        ...[90, 100, 110, 120],
        ...[202, 228, 254, 280],
        ...[314, 356, 398, 440],
        ...[426, 484, 542, 600],
      ]);
    });
  });
});
