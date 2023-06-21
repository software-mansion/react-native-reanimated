type FixedLengthArray<
  T,
  L extends number,
  PassedObject = [T, ...Array<T>]
> = PassedObject & {
  readonly length: L;
  [I: number]: T;
};

export type AffiniteMatrix = FixedLengthArray<FixedLengthArray<number, 4>, 4>;

export type AffiniteMatrixFlat = FixedLengthArray<number, 16>;

export type TransformMatrixDecomposition = Record<
  | 'translationMatrix'
  | 'scaleMatrix'
  | 'rotationMatrix'
  | 'skewMatrix'
  | 'scaleMatrix',
  AffiniteMatrix
>;

type Axis = 'x' | 'y' | 'z';

interface TansformMatrixDecompositionWithAngles
  extends TransformMatrixDecomposition {
  rx: number;
  ry: number;
  rz: number;
}

export function isAffiniteMatrixFlat(x: unknown): x is AffiniteMatrixFlat {
  'worklet';
  return (
    Array.isArray(x) &&
    x.length === 16 &&
    x.every((element) => typeof element === 'number')
  );
}

export function isAffiniteMatrix(x: unknown): x is AffiniteMatrix {
  'worklet';
  return (
    Array.isArray(x) &&
    x.length === 4 &&
    x.every(
      (row) =>
        Array.isArray(row) &&
        row.length === 4 &&
        row.every((element) => typeof element === 'number')
    )
  );
}

export function flatten(matrix: AffiniteMatrix): AffiniteMatrixFlat {
  'worklet';
  return matrix.flat() as AffiniteMatrixFlat;
}

export function unflatten(matrix: AffiniteMatrixFlat): AffiniteMatrix {
  'worklet';

  return [
    [matrix[0], matrix[1], matrix[2], matrix[3]],
    [matrix[4], matrix[5], matrix[6], matrix[7]],
    [matrix[8], matrix[9], matrix[10], matrix[11]],
    [matrix[12], matrix[13], matrix[14], matrix[15]],
  ] as AffiniteMatrix;
}

function maybeFlattenMatrix(
  matrix: AffiniteMatrix | AffiniteMatrixFlat
): AffiniteMatrixFlat {
  'worklet';

  return isAffiniteMatrix(matrix) ? flatten(matrix) : matrix;
}

export function multiplyMatrices(
  a: AffiniteMatrix,
  b: AffiniteMatrix
): AffiniteMatrix {
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

function linearOperationOnMatrix<T extends AffiniteMatrixFlat | AffiniteMatrix>(
  _a: T,
  func: (x: number) => number
): T {
  'worklet';

  const isFlatOnStart = !!isAffiniteMatrixFlat(_a);
  const a: AffiniteMatrixFlat = maybeFlattenMatrix(_a);

  a.forEach((_, i) => {
    a[i] = func(a[i]);
  });

  return isFlatOnStart ? (a as T) : (unflatten(a) as T);
}

function linearOperationOnMatrices<
  T extends AffiniteMatrixFlat | AffiniteMatrix
>(maybeFlatA: T, maybeFlatB: T, operation: 'add' | 'subtract'): T {
  'worklet';

  const isFlatOnStart = !!isAffiniteMatrixFlat(maybeFlatA);
  const a: AffiniteMatrixFlat = maybeFlattenMatrix(maybeFlatA);
  const b: AffiniteMatrixFlat = maybeFlattenMatrix(maybeFlatB);

  a.forEach((_, i) => {
    switch (operation) {
      case 'subtract':
        a[i] -= b[i];
        break;
      case 'add':
        a[i] += b[i];
        break;
    }
  });

  return isFlatOnStart ? (a as T) : (unflatten(a) as T);
}

export function subtractMatrices<T extends AffiniteMatrixFlat | AffiniteMatrix>(
  _a: T,
  _b: T
): T {
  'worklet';

  return linearOperationOnMatrices(_a, _b, 'subtract');
}

export function addMatrices<T extends AffiniteMatrixFlat | AffiniteMatrix>(
  _a: T,
  _b: T
): T {
  'worklet';

  return linearOperationOnMatrices(_a, _b, 'add');
}

export function scaleMatrix<T extends AffiniteMatrixFlat | AffiniteMatrix>(
  _a: T,
  scalar: number
): T {
  'worklet';

  return linearOperationOnMatrix(_a, (x) => x * scalar);
}

export function getRotationMatrix(
  angle: number,
  axis: Axis = 'z'
): AffiniteMatrix {
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

function norm(x: number, y: number, z: number) {
  'worklet';
  return Math.sqrt(x * x + y * y + z * z);
}

function transposeMatrix(matrix: AffiniteMatrix): AffiniteMatrix {
  'worklet';
  const m = flatten(matrix);
  return [
    [m[0], m[4], m[8], m[12]],
    [m[1], m[5], m[9], m[13]],
    [m[2], m[6], m[10], m[14]],
    [m[3], m[7], m[11], m[15]],
  ];
}

function innerProduct(a: number[], b: number[]) {
  'worklet';
  if (a.length !== b.length) {
    console.warn(
      `Cannot calculate inner product of two vectors of different length. Length of ${a} is ${a.length} and length of ${b} is ${b.length}.)`
    );
    return 0;
  }
  return a.reduce((acc, _, i) => acc + a[i] * b[i], 0);
}

function projection(u: number[], a: number[]) {
  'worklet';
  const scaler = innerProduct(u, a) / innerProduct(u, u);
  return u.map((e) => e * scaler);
}

function subtract(a: number[], b: number[]) {
  'worklet';
  return a.map((_, i) => a[i] - b[i]);
}

function scale(u: number[], a: number) {
  'worklet';
  return u.map((e) => e * a);
}

function gramSchmidtAlghoritm(matrix: AffiniteMatrix): {
  rotationMatrix: AffiniteMatrix;
  skewMatrix: AffiniteMatrix;
} {
  'worklet';
  const [a0, a1, a2, a3] = matrix;

  const u0 = a0;
  const u1 = subtract(a1, projection(u0, a1));
  const u2 = subtract(subtract(a2, projection(u0, a2)), projection(u1, a2));
  const u3 = subtract(
    subtract(subtract(a3, projection(u0, a3)), projection(u1, a3)),
    projection(u2, a3)
  );

  const [e0, e1, e2, e3] = [u0, u1, u2, u3].map((u) =>
    scale(u, 1 / Math.sqrt(innerProduct(u, u)))
  );

  const rotationMatrix: AffiniteMatrix = [
    [e0[0], e1[0], e2[0], e3[0]],
    [e0[1], e1[1], e2[1], e3[1]],
    [e0[2], e1[2], e2[2], e3[2]],
    [e0[3], e1[3], e2[3], e3[3]],
  ];

  const skewMatrix: AffiniteMatrix = [
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
  return { rotationMatrix, skewMatrix };
}

export function decomposeMatrix(
  unknownTypeMatrix: AffiniteMatrixFlat | AffiniteMatrix
): TransformMatrixDecomposition {
  'worklet';

  const matrix: AffiniteMatrixFlat = maybeFlattenMatrix(unknownTypeMatrix);

  // Normalize matrix
  const lastElement: number = matrix[15];
  if (lastElement === 0) {
    throw Error('Invalid transform matrix!');
  }

  matrix.forEach((_, index) => (matrix[index] /= lastElement));

  const translationMatrix: AffiniteMatrix = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [matrix[12], matrix[13], matrix[14], 1],
  ];
  const sx = matrix[15] * norm(matrix[0], matrix[4], matrix[8]);
  const sy = matrix[15] * norm(matrix[1], matrix[5], matrix[9]);
  const sz = matrix[15] * norm(matrix[2], matrix[6], matrix[10]);

  const scaleMatrix: AffiniteMatrix = [
    [sx, 0, 0, 0],
    [0, sy, 0, 0],
    [0, 0, sz, 0],
    [0, 0, 0, 1],
  ];

  const rotationAndSkewMatrix: AffiniteMatrix = [
    [matrix[0] / sx, matrix[1] / sx, matrix[2] / sx, 0],
    [matrix[4] / sy, matrix[5] / sy, matrix[6] / sy, 0],
    [matrix[8] / sz, matrix[9] / sz, matrix[10] / sz, 0],
    [0, 0, 0, 1],
  ];

  const { rotationMatrix, skewMatrix } = gramSchmidtAlghoritm(
    rotationAndSkewMatrix
  );

  return {
    translationMatrix,
    scaleMatrix,
    rotationMatrix: transposeMatrix(rotationMatrix),
    skewMatrix: transposeMatrix(skewMatrix),
  };
}

export function decomposeMatrixIntoMatricesAndAngles(
  matrix: AffiniteMatrixFlat | AffiniteMatrix
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
