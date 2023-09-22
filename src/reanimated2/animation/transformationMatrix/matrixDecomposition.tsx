import type { AffineMatrixFlat } from './matrixUtils';
import { unflatten, isAffineMatrix, flatten } from './matrixUtils';

//  Matrix decomposition is a factorization of the given matrix into a product of other matrices.
//  These other matrices represent simple affine transformations:
//      • scale
//      • translation
//      • rotation (3 matrices, fo reach axis)
//      • skew
//  This allows us to correctly animate transition from initial to final transform matrix, since
//  we should animate each transformation separately.

type TransformMatrixDecomposition = Record<
  'translationMatrix' | 'scaleMatrix' | 'rotationMatrix' | 'skewMatrix',
  AffineMatrixFlat
>;

interface TansformMatrixDecompositionWithAngles
  extends TransformMatrixDecomposition {
  rx: number;
  ry: number;
  rz: number;
}

function assertVectorsHaveEqualLengths(a: number[], b: number[]) {
  'worklet';
  if (__DEV__ && a.length !== b.length) {
    throw new Error(
      `[Reanimated] Cannot calculate inner product of two vectors of different lengths. Length of ${a} is ${a.length} and length of ${b} is ${b.length}.`
    );
  }
}

function innerProduct(a: number[], b: number[]) {
  'worklet';
  assertVectorsHaveEqualLengths(a, b);
  return a.reduce((acc, _, i) => acc + a[i] * b[i], 0);
}

function norm3d(x: number, y: number, z: number) {
  'worklet';
  return Math.sqrt(x * x + y * y + z * z);
}

function transposeMatrix(m: AffineMatrixFlat): AffineMatrixFlat {
  'worklet';

  // prettier-ignore
  return [
    m[0], m[4], m[8], m[12],
    m[1], m[5], m[9], m[13],
    m[2], m[6], m[10], m[14],
    m[3], m[7], m[11], m[15],
  ] as const;
}

function projection(u: number[], a: number[]) {
  'worklet';
  assertVectorsHaveEqualLengths(u, a);
  const s = innerProduct(u, a) / innerProduct(u, u);
  return u.map((e) => e * s);
}

function subtractVectors(a: number[], b: number[]) {
  'worklet';
  assertVectorsHaveEqualLengths(a, b);
  return a.map((_, i) => a[i] - b[i]);
}

function scaleVector(u: number[], a: number) {
  'worklet';
  return u.map((e) => e * a);
}

function gramSchmidtAlgorithm(matrix: AffineMatrixFlat): {
  rotationMatrix: AffineMatrixFlat;
  skewMatrix: AffineMatrixFlat;
} {
  // Gram-Schmidt orthogonalization decomposes any matrix with non-zero determinant into an orthogonal and a triangular matrix
  // These matrices are equal to rotation and skew matrices respectively, because we apply it to transformation matrix
  // That is expected to already have extracted the remaining transforms (scale & translation)
  'worklet';
  const [a0, a1, a2, a3] = unflatten(matrix);

  const u0 = a0;
  const u1 = subtractVectors(a1, projection(u0, a1));
  const u2 = subtractVectors(
    subtractVectors(a2, projection(u0, a2)),
    projection(u1, a2)
  );
  const u3 = subtractVectors(
    subtractVectors(
      subtractVectors(a3, projection(u0, a3)),
      projection(u1, a3)
    ),
    projection(u2, a3)
  );

  const [e0, e1, e2, e3] = [u0, u1, u2, u3].map((u) =>
    scaleVector(u, 1 / Math.sqrt(innerProduct(u, u)))
  );

  // prettier-ignore
  const rotationMatrix: AffineMatrixFlat = [
    e0[0], e1[0], e2[0], e3[0],
    e0[1], e1[1], e2[1], e3[1],
    e0[2], e1[2], e2[2], e3[2],
    e0[3], e1[3], e2[3], e3[3],
  ] as const;

  // prettier-ignore
  const skewMatrix: AffineMatrixFlat = [
    innerProduct(e0, a0), innerProduct(e0, a1), innerProduct(e0, a2), innerProduct(e0, a3),
    0, innerProduct(e1, a1), innerProduct(e1, a2), innerProduct(e1, a3),
    0, 0, innerProduct(e2, a2), innerProduct(e2, a3),
    0, 0, 0, innerProduct(e3, a3),
  ] as const;

  return {
    rotationMatrix: transposeMatrix(rotationMatrix),
    skewMatrix: transposeMatrix(skewMatrix),
  };
}

function decomposeMatrix(
  unknownTypeMatrix: AffineMatrixFlat
): TransformMatrixDecomposition {
  'worklet';
  const matrixF = isAffineMatrix(unknownTypeMatrix)
    ? flatten(unknownTypeMatrix)
    : unknownTypeMatrix;

  // normalize matrix
  if (matrixF[15] === 0) {
    throw new Error('[Reanimated] Invalid transform matrix.');
  }

  const matrix = matrixF.map((_, i) => matrixF[i] / matrixF[15]);

  // prettier-ignore
  const translationMatrix: AffineMatrixFlat = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    matrix[12], matrix[13], matrix[14], 1,
  ] as const;
  const sx = matrix[15] * norm3d(matrix[0], matrix[4], matrix[8]);
  const sy = matrix[15] * norm3d(matrix[1], matrix[5], matrix[9]);
  const sz = matrix[15] * norm3d(matrix[2], matrix[6], matrix[10]);

  // prettier-ignore
  const scaleMatrix: AffineMatrixFlat = [
    sx, 0, 0, 0,
    0, sy, 0, 0,
    0, 0, sz, 0,
    0, 0, 0, 1,
  ] as const;

  // prettier-ignore
  const rotationAndSkewMatrix: AffineMatrixFlat = [
    matrix[0] / sx, matrix[1] / sx, matrix[2] / sx, 0,
    matrix[4] / sy, matrix[5] / sy, matrix[6] / sy, 0,
    matrix[8] / sz, matrix[9] / sz, matrix[10] / sz, 0,
    0, 0, 0, 1,
  ] as const;

  const { rotationMatrix, skewMatrix } = gramSchmidtAlgorithm(
    rotationAndSkewMatrix
  );

  return {
    translationMatrix,
    scaleMatrix,
    rotationMatrix,
    skewMatrix,
  };
}

export function decomposeMatrixIntoMatricesAndAngles(
  matrix: AffineMatrixFlat
): TansformMatrixDecompositionWithAngles {
  'worklet';
  const { scaleMatrix, rotationMatrix, translationMatrix, skewMatrix } =
    decomposeMatrix(matrix);

  const sinRy = -rotationMatrix[0 * 4 + 2];

  const ry = Math.asin(sinRy);
  let rx;
  let rz;
  if (sinRy === 1 || sinRy === -1) {
    rz = 0;
    rx = Math.atan2(
      sinRy * rotationMatrix[0 * 4 + 1],
      sinRy * rotationMatrix[0 * 4 + 2]
    );
  } else {
    rz = Math.atan2(rotationMatrix[0 * 4 + 1], rotationMatrix[0 * 4 + 0]);
    rx = Math.atan2(rotationMatrix[1 * 4 + 2], rotationMatrix[2 * 4 + 2]);
  }

  return {
    scaleMatrix,
    rotationMatrix,
    translationMatrix,
    skewMatrix,
    rx: rx || 0,
    ry: ry || 0,
    rz: rz || 0,
  };
}
