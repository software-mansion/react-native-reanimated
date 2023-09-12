type AffineMatrix = [
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

export type AffineMatrixFlat = ArrayOf16 | Readonly<ArrayOf16>;

export type Axis = 'x' | 'y' | 'z';

// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ These functions are common for out TransformMatrix API and matrix decomposition functions ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

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
