import { TransformMatrix } from '../src/reanimated2/animation/transformationMatrix/TransformMatrix';

const identityMatrix = new TransformMatrix([
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
]);

const consecutiveNumMatrix = new TransformMatrix([
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
]);

describe('Matrix util functions', () => {
  describe('Matrix multiplication', () => {
    it('Multiply two identity matrices', () => {
      expect(identityMatrix.multiply(identityMatrix)).toEqual(identityMatrix);
    });
    it('Multiply arbitrary matrix by identity matrix', () => {
      expect(identityMatrix.multiply(consecutiveNumMatrix)).toEqual(
        consecutiveNumMatrix
      );

      expect(consecutiveNumMatrix.multiply(identityMatrix)).toEqual(
        consecutiveNumMatrix
      );
    });

    it('Multiply two arbitrary matrices', () => {
      expect(consecutiveNumMatrix.multiply(consecutiveNumMatrix)).toEqual(
        new TransformMatrix([
          [90, 100, 110, 120],
          [202, 228, 254, 280],
          [314, 356, 398, 440],
          [426, 484, 542, 600],
        ])
      );
    });
  });

  describe('Matrix calculations: ', () => {
    const a = consecutiveNumMatrix;
    const b = new TransformMatrix([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ]);

    const aMinusB = new TransformMatrix([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [8, 9, 10, 11],
      [12, 13, 14, 15],
    ]);
    const aPlusB = new TransformMatrix([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [10, 11, 12, 13],
      [14, 15, 16, 17],
    ]);

    it('subtract matrices', () => {
      expect(a.subtract(b)).toEqual(aMinusB);
      expect(a.subtract(b)).toEqual(aMinusB);
    });

    it('add matrices', () => {
      expect(a.add(b)).toEqual(aPlusB);
      expect(a.add(b)).toEqual(aPlusB);
    });
  });
});
