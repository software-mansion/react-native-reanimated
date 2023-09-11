export type AffineMatrix = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number]
];

type ArrayOf16 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];

export type Vector3DType = [number, number, number];
export type AffineMatrixFlat = ArrayOf16 | Readonly<ArrayOf16>;

type TransformMatrixDecomposition = Record<
  'translationMatrix' | '_scaleMatrix' | 'rotationMatrix' | 'skewMatrix',
  AffineMatrixFlat
>;

export type Axis = 'x' | 'y' | 'z';

interface TansformMatrixDecompositionWithAngles
  extends TransformMatrixDecomposition {
  rx: number;
  ry: number;
  rz: number;
}

// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ This functions are exported and exposed as API through class 🅼🅰🆃🆁🅸🆇 🆃🆁🅰🅽🆂🅵🅾🆁🅼 ┃
// ┃ We don't define them directly in a this class, because using class on UI thread is not  ┃
// ┃ efficient. So we use them directly in our internal code, but we provide a clean API for ┃
// ┃ external users                                                                          ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

// ts-prune-ignore-next This function is exported to be tested
export function isAffineMatrix(x: unknown): x is AffineMatrix {
  'worklet';
  return (
    Array.isArray(x) &&
    x.length === 4 &&
    x.every(
      (row) =>
        Array.isArray(row) &&
        row.length === 4 &&
        row.every((element) => typeof element === 'number' && !isNaN(element))
    )
  );
}

export function isAffineMatrixFlat(x: unknown): x is AffineMatrixFlat {
  'worklet';
  return (
    Array.isArray(x) &&
    x.length === 16 &&
    x.every((element) => typeof element === 'number' && !isNaN(element))
  );
}

export function flatten(matrix: AffineMatrix): AffineMatrixFlat {
  'worklet';
  const [col1, col2, col3, col4] = matrix;
  return [...col1, ...col2, ...col3, ...col4];
}

// ts-prune-ignore-next This function is exported to be tested
export function unflatten(m: AffineMatrixFlat): AffineMatrix {
  'worklet';
  return [
    [m[0], m[1], m[2], m[3]],
    [m[4], m[5], m[6], m[7]],
    [m[8], m[9], m[10], m[11]],
    [m[12], m[13], m[14], m[15]],
  ] as AffineMatrix;
}

function maybeFlattenMatrix(
  matrix: AffineMatrix | AffineMatrixFlat
): AffineMatrixFlat {
  'worklet';

  return isAffineMatrix(matrix) ? flatten(matrix) : matrix;
}

export function _multiplyMatrices(
  aFlat: AffineMatrixFlat,
  bFlat: AffineMatrixFlat
): AffineMatrixFlat {
  'worklet';
  const a = unflatten(aFlat);
  const b = unflatten(bFlat);

  return [
    ...[
      a[0][0] * b[0][0] +
        a[0][1] * b[1][0] +
        a[0][2] * b[2][0] +
        a[0][3] * b[3][0],

      a[0][0] * b[0][1] +
        a[0][1] * b[1][1] +
        a[0][2] * b[2][1] +
        a[0][3] * b[3][1],

      a[0][0] * b[0][2] +
        a[0][1] * b[1][2] +
        a[0][2] * b[2][2] +
        a[0][3] * b[3][2],

      a[0][0] * b[0][3] +
        a[0][1] * b[1][3] +
        a[0][2] * b[2][3] +
        a[0][3] * b[3][3],
    ],
    ...[
      a[1][0] * b[0][0] +
        a[1][1] * b[1][0] +
        a[1][2] * b[2][0] +
        a[1][3] * b[3][0],

      a[1][0] * b[0][1] +
        a[1][1] * b[1][1] +
        a[1][2] * b[2][1] +
        a[1][3] * b[3][1],

      a[1][0] * b[0][2] +
        a[1][1] * b[1][2] +
        a[1][2] * b[2][2] +
        a[1][3] * b[3][2],

      a[1][0] * b[0][3] +
        a[1][1] * b[1][3] +
        a[1][2] * b[2][3] +
        a[1][3] * b[3][3],
    ],
    ...[
      a[2][0] * b[0][0] +
        a[2][1] * b[1][0] +
        a[2][2] * b[2][0] +
        a[2][3] * b[3][0],

      a[2][0] * b[0][1] +
        a[2][1] * b[1][1] +
        a[2][2] * b[2][1] +
        a[2][3] * b[3][1],

      a[2][0] * b[0][2] +
        a[2][1] * b[1][2] +
        a[2][2] * b[2][2] +
        a[2][3] * b[3][2],

      a[2][0] * b[0][3] +
        a[2][1] * b[1][3] +
        a[2][2] * b[2][3] +
        a[2][3] * b[3][3],
    ],
    ...[
      a[3][0] * b[0][0] +
        a[3][1] * b[1][0] +
        a[3][2] * b[2][0] +
        a[3][3] * b[3][0],

      a[3][0] * b[0][1] +
        a[3][1] * b[1][1] +
        a[3][2] * b[2][1] +
        a[3][3] * b[3][1],

      a[3][0] * b[0][2] +
        a[3][1] * b[1][2] +
        a[3][2] * b[2][2] +
        a[3][3] * b[3][2],

      a[3][0] * b[0][3] +
        a[3][1] * b[1][3] +
        a[3][2] * b[2][3] +
        a[3][3] * b[3][3],
    ],
  ] as const;
}

export function _subtractMatrices(
  a: AffineMatrixFlat,
  b: AffineMatrixFlat
): AffineMatrixFlat {
  'worklet';
  return a.map((_, i) => a[i] - b[i]) as AffineMatrixFlat;
}

export function _addMatrices(
  a: AffineMatrixFlat,
  b: AffineMatrixFlat
): AffineMatrixFlat {
  'worklet';

  return a.map((_, i) => a[i] + b[i]) as AffineMatrixFlat;
}

export function _scaleMatrix(
  a: AffineMatrixFlat,
  scalar: number
): AffineMatrixFlat {
  'worklet';
  return a.map((x) => x * scalar) as AffineMatrixFlat;
}

export function _getRotationMatrix(
  angle: number,
  axis: Axis = 'z'
): AffineMatrixFlat {
  'worklet';
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  switch (axis) {
    case 'z':
      return [
        ...[cos, sin, 0, 0],
        ...[-sin, cos, 0, 0],
        ...[0, 0, 1, 0],
        ...[0, 0, 0, 1],
      ] as const;
    case 'y':
      return [
        ...[cos, 0, -sin, 0],
        ...[0, 1, 0, 0],
        ...[sin, 0, cos, 0],
        ...[0, 0, 0, 1],
      ] as const;
    case 'x':
      return [
        ...[1, 0, 0, 0],
        ...[0, cos, sin, 0],
        ...[0, -sin, cos, 0],
        ...[0, 0, 0, 1],
      ] as const;
  }
}

function norm3d(x: number, y: number, z: number) {
  'worklet';
  return Math.sqrt(x * x + y * y + z * z);
}

function transposeMatrix(m: AffineMatrixFlat): AffineMatrixFlat {
  'worklet';
  return [
    ...[m[0], m[4], m[8], m[12]],
    ...[m[1], m[5], m[9], m[13]],
    ...[m[2], m[6], m[10], m[14]],
    ...[m[3], m[7], m[11], m[15]],
  ] as const;
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

  const rotationMatrix: AffineMatrixFlat = [
    ...[e0[0], e1[0], e2[0], e3[0]],
    ...[e0[1], e1[1], e2[1], e3[1]],
    ...[e0[2], e1[2], e2[2], e3[2]],
    ...[e0[3], e1[3], e2[3], e3[3]],
  ] as const;

  const skewMatrix: AffineMatrixFlat = [
    ...[
      innerProduct(e0, a0),
      innerProduct(e0, a1),
      innerProduct(e0, a2),
      innerProduct(e0, a3),
    ],
    ...[0, innerProduct(e1, a1), innerProduct(e1, a2), innerProduct(e1, a3)],
    ...[0, 0, innerProduct(e2, a2), innerProduct(e2, a3)],
    ...[0, 0, 0, innerProduct(e3, a3)],
  ] as const;
  return {
    rotationMatrix: transposeMatrix(rotationMatrix),
    skewMatrix: transposeMatrix(skewMatrix),
  };
}

// ts-prune-ignore-next This function is exported to be tested
export function decomposeMatrix(
  unknownTypeMatrix: AffineMatrixFlat
): TransformMatrixDecomposition {
  'worklet';
  const matrixF = maybeFlattenMatrix(unknownTypeMatrix);

  // normalize matrix
  if (matrixF[15] === 0) {
    throw new Error('[Reanimated] Invalid transform matrix.');
  }

  const matrix = matrixF.map((_, i) => matrixF[i] / matrixF[15]);

  const translationMatrix: AffineMatrixFlat = [
    ...[1, 0, 0, 0],
    ...[0, 1, 0, 0],
    ...[0, 0, 1, 0],
    ...[matrix[12], matrix[13], matrix[14], 1],
  ] as const;
  const sx = matrix[15] * norm3d(matrix[0], matrix[4], matrix[8]);
  const sy = matrix[15] * norm3d(matrix[1], matrix[5], matrix[9]);
  const sz = matrix[15] * norm3d(matrix[2], matrix[6], matrix[10]);

  const _scaleMatrix: AffineMatrixFlat = [
    ...[sx, 0, 0, 0],
    ...[0, sy, 0, 0],
    ...[0, 0, sz, 0],
    ...[0, 0, 0, 1],
  ] as const;

  const rotationAndSkewMatrix: AffineMatrixFlat = [
    ...[matrix[0] / sx, matrix[1] / sx, matrix[2] / sx, 0],
    ...[matrix[4] / sy, matrix[5] / sy, matrix[6] / sy, 0],
    ...[matrix[8] / sz, matrix[9] / sz, matrix[10] / sz, 0],
    ...[0, 0, 0, 1],
  ] as const;

  const { rotationMatrix, skewMatrix } = gramSchmidtAlgorithm(
    rotationAndSkewMatrix
  );

  return {
    translationMatrix,
    _scaleMatrix,
    rotationMatrix,
    skewMatrix,
  };
}

export function decomposeMatrixIntoMatricesAndAngles(
  matrix: AffineMatrixFlat
): TansformMatrixDecompositionWithAngles {
  'worklet';
  const { _scaleMatrix, rotationMatrix, translationMatrix, skewMatrix } =
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
    _scaleMatrix,
    rotationMatrix,
    translationMatrix,
    skewMatrix,
    rx: rx || 0,
    ry: ry || 0,
    rz: rz || 0,
  };
}
