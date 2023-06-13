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
  const result = [];
  const matrixCopy = [...matrix];
  while (matrixCopy.length) {
    result.push(matrixCopy.splice(0, 4));
  }
  return result as AffiniteMatrix;
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
  const output: AffiniteMatrix = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      for (let i = 0; i < 4; i++) {
        output[x][y] += a[x][i] * b[i][y];
      }
    }
  }

  return output;
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
>(_a: T, _b: T, operation: 'add' | 'subtract'): T {
  'worklet';

  const isFlatOnStart = !!isAffiniteMatrixFlat(_a);
  const a: AffiniteMatrixFlat = maybeFlattenMatrix(_a);
  const b: AffiniteMatrixFlat = maybeFlattenMatrix(_b);

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
  axis: 'x' | 'y' | 'z' = 'z'
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

function transposeMatrix(_m: AffiniteMatrix): AffiniteMatrix {
  'worklet';
  const m = flatten(_m);
  return [
    [m[0], m[4], m[8], m[12]],
    [m[1], m[5], m[9], m[13]],
    [m[2], m[6], m[10], m[14]],
    [m[3], m[7], m[11], m[15]],
  ];
}

function innerProduct(a: number[], b: number[]) {
  'worklet';
  if (!(a.length === b.length)) {
    console.warn(
      `Error when evaluation inner product of ${a} and ${b}, because these arrays should have equal length`
    );
    return 0;
  }
  let output = 0;
  a.forEach((_, i) => (output += a[i] * b[i]));
  return output;
}

function projection(u: number[], a: number[]) {
  'worklet';
  const scaler = innerProduct(u, a) / innerProduct(u, u);
  const output: Array<number> = [];
  u.forEach((e) => output.push(e * scaler));
  return output;
}

function subtract(a: number[], b: number[]) {
  'worklet';
  const output: Array<number> = [];
  a.forEach((_, i) => output.push(a[i] - b[i]));
  return output;
}

function scale(u: number[], a: number) {
  'worklet';
  const output: Array<number> = [];
  u.forEach((e) => output.push(e * a));
  return output;
}

function grahamSchmidtAlghoritm(matrix: AffiniteMatrix): {
  rotationMatrix: AffiniteMatrix;
  skewMatrix: AffiniteMatrix;
} {
  'worklet';
  const a1 = matrix[0];
  const a2 = matrix[1];
  const a3 = matrix[2];
  const a4 = matrix[3];

  const u1 = a1;
  const u2 = subtract(a2, projection(u1, a2));
  const u3 = subtract(subtract(a3, projection(u1, a3)), projection(u2, a3));
  const u4 = subtract(
    subtract(subtract(a4, projection(u1, a4)), projection(u2, a4)),
    projection(u3, a4)
  );

  const e1 = scale(u1, 1 / Math.sqrt(innerProduct(u1, u1)));
  const e2 = scale(u2, 1 / Math.sqrt(innerProduct(u2, u2)));
  const e3 = scale(u3, 1 / Math.sqrt(innerProduct(u3, u3)));
  const e4 = scale(u4, 1 / Math.sqrt(innerProduct(u4, u4)));

  const rotationMatrix: AffiniteMatrix = [
    [e1[0], e2[0], e3[0], e4[0]],
    [e1[1], e2[1], e3[1], e4[1]],
    [e1[2], e2[2], e3[2], e4[2]],
    [e1[3], e2[3], e3[3], e4[3]],
  ];

  const skewMatrix: AffiniteMatrix = [
    [
      innerProduct(e1, a1),
      innerProduct(e1, a2),
      innerProduct(e1, a3),
      innerProduct(e1, a4),
    ],
    [0, innerProduct(e2, a2), innerProduct(e2, a3), innerProduct(e2, a4)],
    [0, 0, innerProduct(e3, a3), innerProduct(e3, a4)],
    [0, 0, 0, innerProduct(e4, a4)],
  ];
  return { rotationMatrix, skewMatrix };
}

export function decomposeMatrix(
  _matrix: AffiniteMatrixFlat | AffiniteMatrix
): TransformMatrixDecomposition {
  'worklet';

  const matrix: AffiniteMatrixFlat = maybeFlattenMatrix(_matrix);

  // Normalize matrix
  const lastElement: number = matrix[15];
  if (lastElement === 0) console.error('Invalid transform matrix!');
  _matrix.forEach((_, index) => (matrix[index] /= lastElement));

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

  const { rotationMatrix, skewMatrix } = grahamSchmidtAlghoritm(
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
  _matrix: AffiniteMatrixFlat | AffiniteMatrix
): TansformMatrixDecompositionWithAngles {
  'worklet';
  const { scaleMatrix, rotationMatrix, translationMatrix, skewMatrix } =
    decomposeMatrix(_matrix);

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
