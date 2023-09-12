import type { AffineMatrixFlat, Axis } from './matrixUtils';
import { _multiplyMatrices, _getRotationMatrix } from './matrixUtils';

// ╔═══════════════════════════╗
// ║  This is part of the API  ║ // SOON ;-)
// ╚═══════════════════════════╝

function getAngle(angle: number | string) {
  'worklet';
  if (typeof angle === 'number') {
    return angle;
  }
  const angleRegex = /^(?<value>-?[.\d]+)deg/;
  const numberAsString = angle.match(angleRegex)?.groups?.value;
  if (!numberAsString) {
    throw Error(`Unable to understand angle ${numberAsString}`);
  }

  return Math.PI * 2 * (Number(numberAsString) / 360);
}

export const TransformMatrix = {
  getIdentityMatrix: () => {
    'worklet';
    return [...[1, 0, 0, 0], ...[0, 1, 0, 0], ...[0, 0, 1, 0], ...[0, 0, 0, 1]];
  },

  getRotationMatrix: (angle: number | string, axis: Axis = 'z') => {
    'worklet';
    const angleValue = getAngle(angle);
    return _getRotationMatrix(angleValue, axis) as number[];
  },
  getScaleMatrix: (scale: number | [number, number, number]) => {
    'worklet';
    const [sx, sy, sz] = Array.isArray(scale) ? scale : [scale, scale, scale];

    return [
      ...[sx, 0, 0, 0],
      ...[0, sy, 0, 0],
      ...[0, 0, sz, 0],
      ...[0, 0, 0, 1],
    ];
  },

  getTranslationMatrix: (x: number, y: number, z: number) => {
    'worklet';
    return [...[1, 0, 0, 0], ...[0, 1, 0, 0], ...[0, 0, 1, 0], ...[x, y, z, 1]];
  },

  multiplyMatrices: (a: Array<number>, b: Array<number>) => {
    'worklet';
    return _multiplyMatrices(
      a as AffineMatrixFlat,
      b as AffineMatrixFlat
    ) as number[];
  },
};
