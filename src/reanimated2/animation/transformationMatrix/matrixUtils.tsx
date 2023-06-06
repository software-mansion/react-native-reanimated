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

export function linearOperationOnMatrix<
  T extends AffiniteMatrixFlat | AffiniteMatrix
>(_a: T, func: (x: number) => number): T {
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
        [cos, 0, sin, 0],
        [0, 0, 1, 0],
        [-sin, 0, cos, 0],
        [0, 0, 0, 1],
      ];
    case 'x':
      return [
        [1, 0, 0, 0],
        [0, cos, -sin, 0],
        [0, sin, cos, 0],
        [0, 0, 0, 1],
      ];
  }
}

function norm(x: number, y: number, z: number) {
  'worklet';
  return Math.sqrt(x * x + y * y + z * z);
}

export function decomposeMatrix(_matrix: AffiniteMatrixFlat | AffiniteMatrix) {
  'worklet';

  const matrix: AffiniteMatrixFlat = maybeFlattenMatrix(_matrix);

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

  const rotationMatrix: AffiniteMatrix = [
    [matrix[0] / sx, matrix[1] / sx, matrix[2] / sx, 0],
    [matrix[4] / sy, matrix[5] / sy, matrix[6] / sy, 0],
    [matrix[8] / sz, matrix[9] / sz, matrix[10] / sz, 0],
    [0, 0, 0, 1],
  ];

  return { translationMatrix, scaleMatrix, rotationMatrix };
}

export function decomposeMatrixIntoMatricesAndAngles(
  _matrix: AffiniteMatrixFlat | AffiniteMatrix
) {
  'worklet';
  const { scaleMatrix, rotationMatrix, translationMatrix } =
    decomposeMatrix(_matrix);

  /** We want to find angle of rotation around each axes
   * R_z(α), R_y(β), R_x(γ) */

  const ry = Math.asin(-flatten(rotationMatrix)[2]);
  const rx = Math.asin(flatten(rotationMatrix)[6] / Math.cos(ry));
  const rz = Math.asin(flatten(rotationMatrix)[1] / Math.cos(ry));

  return { scaleMatrix, rotationMatrix, translationMatrix, rx, ry, rz };
}
