'use strict';
type FixedLengthArray<
  T,
  L extends number,
  PassedObject = [T, ...Array<T>]
> = PassedObject & {
  readonly length: L;
  [I: number]: T;
};

export type AffineMatrix = FixedLengthArray<FixedLengthArray<number, 4>, 4>;

export type AffineMatrixFlat = FixedLengthArray<number, 16>;

type TransformMatrixDecomposition = Record<
  'translationMatrix' | 'scaleMatrix' | 'rotationMatrix' | 'skewMatrix',
  AffineMatrix
>;

type Axis = 'x' | 'y' | 'z';

interface TansformMatrixDecompositionWithAngles
  extends TransformMatrixDecomposition {
  rx: number;
  ry: number;
  rz: number;
}

export function isAffineMatrixFlat(x: unknown): x is AffineMatrixFlat {
  'worklet';
  return (
    Array.isArray(x) &&
    x.length === 16 &&
    x.every((element) => typeof element === 'number' && !isNaN(element))
  );
}

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

export function flatten(matrix: AffineMatrix): AffineMatrixFlat {
  'worklet';
  return matrix.flat() as AffineMatrixFlat;
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

export function multiplyMatrices(
  a: AffineMatrix,
  b: AffineMatrix
): AffineMatrix {
  'worklet';
  return [
    [
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
    [
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
    [
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
    [
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
  ];
}

export function subtractMatrices<T extends AffineMatrixFlat | AffineMatrix>(
  maybeFlatA: T,
  maybeFlatB: T
): T {
  'worklet';
  const isFlatOnStart = isAffineMatrixFlat(maybeFlatA);
  const a: AffineMatrixFlat = maybeFlattenMatrix(maybeFlatA);
  const b: AffineMatrixFlat = maybeFlattenMatrix(maybeFlatB);

  const c = a.map((_, i) => a[i] - b[i]) as AffineMatrixFlat;
  return isFlatOnStart ? (c as T) : (unflatten(c) as T);
}

export function addMatrices<T extends AffineMatrixFlat | AffineMatrix>(
  maybeFlatA: T,
  maybeFlatB: T
): T {
  'worklet';
  const isFlatOnStart = isAffineMatrixFlat(maybeFlatA);
  const a = maybeFlattenMatrix(maybeFlatA);
  const b = maybeFlattenMatrix(maybeFlatB);

  const c = a.map((_, i) => a[i] + b[i]) as AffineMatrixFlat;
  return isFlatOnStart ? (c as T) : (unflatten(c) as T);
}

export function scaleMatrix<T extends AffineMatrixFlat | AffineMatrix>(
  maybeFlatA: T,
  scalar: number
): T {
  'worklet';
  const isFlatOnStart = isAffineMatrixFlat(maybeFlatA);
  const a = maybeFlattenMatrix(maybeFlatA);

  const b = a.map((x) => x * scalar) as AffineMatrixFlat;
  return isFlatOnStart ? (b as T) : (unflatten(b) as T);
}

export function getRotationMatrix(
  angle: number,
  axis: Axis = 'z'
): AffineMatrix {
  'worklet';
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  switch (axis) {
    case 'z':
      return [
        [cos, sin, 0, 0],
        [-sin, cos, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ];
    case 'y':
      return [
        [cos, 0, -sin, 0],
        [0, 1, 0, 0],
        [sin, 0, cos, 0],
        [0, 0, 0, 1],
      ];
    case 'x':
      return [
        [1, 0, 0, 0],
        [0, cos, sin, 0],
        [0, -sin, cos, 0],
        [0, 0, 0, 1],
      ];
  }
}

function norm3d(x: number, y: number, z: number) {
  'worklet';
  return Math.sqrt(x * x + y * y + z * z);
}

function transposeMatrix(matrix: AffineMatrix): AffineMatrix {
  'worklet';
  const m = flatten(matrix);
  return [
    [m[0], m[4], m[8], m[12]],
    [m[1], m[5], m[9], m[13]],
    [m[2], m[6], m[10], m[14]],
    [m[3], m[7], m[11], m[15]],
  ];
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

function gramSchmidtAlgorithm(matrix: AffineMatrix): {
  rotationMatrix: AffineMatrix;
  skewMatrix: AffineMatrix;
} {
  // Gram-Schmidt orthogonalization decomposes any matrix with non-zero determinant into an orthogonal and a triangular matrix
  // These matrices are equal to rotation and skew matrices respectively, because we apply it to transformation matrix
  // That is expected to already have extracted the remaining transforms (scale & translation)
  'worklet';
  const [a0, a1, a2, a3] = matrix;

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

  const rotationMatrix: AffineMatrix = [
    [e0[0], e1[0], e2[0], e3[0]],
    [e0[1], e1[1], e2[1], e3[1]],
    [e0[2], e1[2], e2[2], e3[2]],
    [e0[3], e1[3], e2[3], e3[3]],
  ];

  const skewMatrix: AffineMatrix = [
    [
      innerProduct(e0, a0),
      innerProduct(e0, a1),
      innerProduct(e0, a2),
      innerProduct(e0, a3),
    ],
    [0, innerProduct(e1, a1), innerProduct(e1, a2), innerProduct(e1, a3)],
    [0, 0, innerProduct(e2, a2), innerProduct(e2, a3)],
    [0, 0, 0, innerProduct(e3, a3)],
  ];
  return {
    rotationMatrix: transposeMatrix(rotationMatrix),
    skewMatrix: transposeMatrix(skewMatrix),
  };
}

// ts-prune-ignore-next This function is exported to be tested
export function decomposeMatrix(
  unknownTypeMatrix: AffineMatrixFlat | AffineMatrix
): TransformMatrixDecomposition {
  'worklet';
  const matrix = maybeFlattenMatrix(unknownTypeMatrix);

  // normalize matrix
  if (matrix[15] === 0) {
    throw new Error('[Reanimated] Invalid transform matrix.');
  }
  matrix.forEach((_, i) => (matrix[i] /= matrix[15]));

  const translationMatrix: AffineMatrix = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [matrix[12], matrix[13], matrix[14], 1],
  ];
  const sx = matrix[15] * norm3d(matrix[0], matrix[4], matrix[8]);
  const sy = matrix[15] * norm3d(matrix[1], matrix[5], matrix[9]);
  const sz = matrix[15] * norm3d(matrix[2], matrix[6], matrix[10]);

  const scaleMatrix: AffineMatrix = [
    [sx, 0, 0, 0],
    [0, sy, 0, 0],
    [0, 0, sz, 0],
    [0, 0, 0, 1],
  ];

  const rotationAndSkewMatrix: AffineMatrix = [
    [matrix[0] / sx, matrix[1] / sx, matrix[2] / sx, 0],
    [matrix[4] / sy, matrix[5] / sy, matrix[6] / sy, 0],
    [matrix[8] / sz, matrix[9] / sz, matrix[10] / sz, 0],
    [0, 0, 0, 1],
  ];

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
  matrix: AffineMatrixFlat | AffineMatrix
): TansformMatrixDecompositionWithAngles {
  'worklet';
  const { scaleMatrix, rotationMatrix, translationMatrix, skewMatrix } =
    decomposeMatrix(matrix);

  const sinRy = -rotationMatrix[0][2];

  const ry = Math.asin(sinRy);
  let rx;
  let rz;
  if (sinRy === 1 || sinRy === -1) {
    rz = 0;
    rx = Math.atan2(sinRy * rotationMatrix[0][1], sinRy * rotationMatrix[0][2]);
  } else {
    rz = Math.atan2(rotationMatrix[0][1], rotationMatrix[0][0]);
    rx = Math.atan2(rotationMatrix[1][2], rotationMatrix[2][2]);
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
