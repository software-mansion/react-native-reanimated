'use strict';

export type NativeTransformMatrix = [
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
  number,
];

export interface NativeLayoutRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

const IDENTITY_MATRIX: NativeTransformMatrix = [
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
];

function multiply(
  lhs: NativeTransformMatrix,
  rhs: NativeTransformMatrix
): NativeTransformMatrix {
  'worklet';
  const result = Array<number>(16).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      for (let index = 0; index < 4; index++) {
        result[row * 4 + column] +=
          lhs[row * 4 + index] * rhs[index * 4 + column];
      }
    }
  }
  return result as NativeTransformMatrix;
}

/**
 * Mirrors `facebook::react::Transform::operator*`. React Native stores row
 * vectors and intentionally concatenates `lhs * rhs` as the conventional matrix
 * product `rhs × lhs`.
 */
function concatenate(
  lhs: NativeTransformMatrix,
  rhs: NativeTransformMatrix
): NativeTransformMatrix {
  'worklet';
  return multiply(rhs, lhs);
}

function translate(x: number, y: number, z = 0): NativeTransformMatrix {
  'worklet';
  const result = [...IDENTITY_MATRIX] as NativeTransformMatrix;
  result[12] = x;
  result[13] = y;
  result[14] = z;
  return result;
}

function scale(x: number, y: number, z = 1): NativeTransformMatrix {
  'worklet';
  const result = [...IDENTITY_MATRIX] as NativeTransformMatrix;
  result[0] = x;
  result[5] = y;
  result[10] = z;
  return result;
}

function rotateX(radians: number): NativeTransformMatrix {
  'worklet';
  const result = [...IDENTITY_MATRIX] as NativeTransformMatrix;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  result[5] = cosine;
  result[6] = sine;
  result[9] = -sine;
  result[10] = cosine;
  return result;
}

function rotateY(radians: number): NativeTransformMatrix {
  'worklet';
  const result = [...IDENTITY_MATRIX] as NativeTransformMatrix;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  result[0] = cosine;
  result[2] = -sine;
  result[8] = sine;
  result[10] = cosine;
  return result;
}

function rotateZ(radians: number): NativeTransformMatrix {
  'worklet';
  const result = [...IDENTITY_MATRIX] as NativeTransformMatrix;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  result[0] = cosine;
  result[1] = sine;
  result[4] = -sine;
  result[5] = cosine;
  return result;
}

function skew(x: number, y: number): NativeTransformMatrix {
  'worklet';
  const result = [...IDENTITY_MATRIX] as NativeTransformMatrix;
  result[4] = Math.tan(x);
  result[1] = Math.tan(y);
  return result;
}

function perspective(value: number): NativeTransformMatrix | null {
  'worklet';
  if (!Number.isFinite(value) || value === 0) {
    return null;
  }
  const result = [...IDENTITY_MATRIX] as NativeTransformMatrix;
  result[11] = -1 / value;
  return result;
}

function parseAngle(value: unknown): number | null {
  'worklet';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const numeric = parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return value.trim().endsWith('deg') ? (numeric * Math.PI) / 180 : numeric;
}

function length(value: unknown, reference: number): number | null {
  'worklet';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const numeric = parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return value.trim().endsWith('%') ? (numeric * reference) / 100 : numeric;
}

function suppliedMatrix(value: unknown): NativeTransformMatrix | null {
  'worklet';
  if (
    !Array.isArray(value) ||
    value.length !== 16 ||
    !value.every(
      (element) => typeof element === 'number' && Number.isFinite(element)
    )
  ) {
    return null;
  }
  return [...value] as NativeTransformMatrix;
}

function operationMatrix(
  name: string,
  value: unknown,
  width: number,
  height: number
): NativeTransformMatrix | null {
  'worklet';
  switch (name) {
    case 'matrix':
      return suppliedMatrix(value);
    case 'translateX': {
      const resolved = length(value, width);
      return resolved === null ? null : translate(resolved, 0);
    }
    case 'translateY': {
      const resolved = length(value, height);
      return resolved === null ? null : translate(0, resolved);
    }
    case 'scale':
      return typeof value === 'number' && Number.isFinite(value)
        ? scale(value, value)
        : null;
    case 'scaleX':
      return typeof value === 'number' && Number.isFinite(value)
        ? scale(value, 1)
        : null;
    case 'scaleY':
      return typeof value === 'number' && Number.isFinite(value)
        ? scale(1, value)
        : null;
    case 'rotate':
    case 'rotateZ': {
      const resolved = parseAngle(value);
      return resolved === null ? null : rotateZ(resolved);
    }
    case 'rotateX': {
      const resolved = parseAngle(value);
      return resolved === null ? null : rotateX(resolved);
    }
    case 'rotateY': {
      const resolved = parseAngle(value);
      return resolved === null ? null : rotateY(resolved);
    }
    case 'skewX': {
      const resolved = parseAngle(value);
      return resolved === null ? null : skew(resolved, 0);
    }
    case 'skewY': {
      const resolved = parseAngle(value);
      return resolved === null ? null : skew(0, resolved);
    }
    case 'perspective':
      return typeof value === 'number' ? perspective(value) : null;
    default:
      return null;
  }
}

function normalizeTransformOrigin(origin: unknown): unknown[] | null {
  'worklet';
  if (origin === undefined) {
    return null;
  }
  if (Array.isArray(origin)) {
    return origin;
  }
  if (typeof origin === 'string') {
    const components: unknown[] = origin.trim().split(/\s+/);
    if (
      (components[0] === 'top' || components[0] === 'bottom') &&
      (components[1] === undefined ||
        components[1] === 'left' ||
        components[1] === 'center' ||
        components[1] === 'right')
    ) {
      [components[0], components[1]] = [components[1], components[0]];
    }
    return components;
  }
  return [];
}

function originCoordinate(
  value: unknown,
  axis: 'x' | 'y',
  extent: number
): number | null {
  'worklet';
  if (value === undefined || value === 'center') {
    return extent / 2;
  }
  if (value === (axis === 'x' ? 'left' : 'top')) {
    return 0;
  }
  if (value === (axis === 'x' ? 'right' : 'bottom')) {
    return extent;
  }
  return length(value, extent);
}

export function resolveReactNativeTransformMatrix(
  transform: unknown,
  width: number,
  height: number,
  transformOrigin?: unknown
): NativeTransformMatrix | null {
  'worklet';
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

  let result = [...IDENTITY_MATRIX] as NativeTransformMatrix;
  if (transform !== undefined) {
    if (!Array.isArray(transform)) {
      return null;
    }
    if (
      transform.length > 1 &&
      transform.some(
        (entry) =>
          entry !== null &&
          typeof entry === 'object' &&
          Object.prototype.hasOwnProperty.call(entry, 'matrix')
      )
    ) {
      return null;
    }
    for (const entry of transform) {
      if (entry === null || typeof entry !== 'object') {
        return null;
      }
      const names = Object.keys(entry);
      if (names.length !== 1) {
        return null;
      }
      const name = names[0];
      const operation = operationMatrix(
        name,
        (entry as Record<string, unknown>)[name],
        width,
        height
      );
      if (operation === null) {
        return null;
      }
      result = concatenate(result, operation);
    }
  }

  const normalizedOrigin = normalizeTransformOrigin(transformOrigin);
  if (normalizedOrigin === null) {
    return result;
  }
  if (normalizedOrigin.length < 1 || normalizedOrigin.length > 3) {
    return null;
  }
  const originX = originCoordinate(normalizedOrigin[0], 'x', width);
  const originY = originCoordinate(normalizedOrigin[1], 'y', height);
  const originZ =
    normalizedOrigin[2] === undefined ? 0 : length(normalizedOrigin[2], 0);
  if (originX === null || originY === null || originZ === null) {
    return null;
  }
  const offsetX = originX - width / 2;
  const offsetY = originY - height / 2;
  result = concatenate(
    concatenate(translate(offsetX, offsetY, originZ), result),
    translate(-offsetX, -offsetY, -originZ)
  );
  return result;
}

export function composeLayoutFlipMatrix(
  current: NativeLayoutRect,
  final: NativeLayoutRect,
  styleMatrix: NativeTransformMatrix
): NativeTransformMatrix | null {
  'worklet';
  if (
    !Object.values(current).every(Number.isFinite) ||
    !Object.values(final).every(Number.isFinite) ||
    final.width <= 0 ||
    final.height <= 0 ||
    current.width < 0 ||
    current.height < 0
  ) {
    return null;
  }
  const scaleX = current.width / final.width;
  const scaleY = current.height / final.height;
  const translationX =
    current.originX + current.width / 2 - (final.originX + final.width / 2);
  const translationY =
    current.originY + current.height / 2 - (final.originY + final.height / 2);
  const layoutMatrix = concatenate(
    translate(translationX, translationY),
    scale(scaleX, scaleY)
  );
  return concatenate(layoutMatrix, styleMatrix);
}
