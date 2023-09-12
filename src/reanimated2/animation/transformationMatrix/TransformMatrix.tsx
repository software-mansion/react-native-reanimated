import type { Vector3D } from './Vector3D';
import type { AffineMatrixFlat, Axis } from './matrixUtils';
import {
  _addMatrices,
  _multiplyMatrices,
  _subtractMatrices,
  flatten,
  isAffineMatrix,
  isAffineMatrixFlat,
  _scaleMatrix,
  _getRotationMatrix,
} from './matrixUtils';

// ╔═══════════════════════════╗
// ║  This is part of the API  ║ // SOON ;-)
// ╚═══════════════════════════╝

function getAngle(angle: number | string) {
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

export class TransformMatrix {
  public value: number[];
  private _value: AffineMatrixFlat;

  constructor(matrix: Array<Array<number>> | Array<number> | AffineMatrixFlat) {
    if (isAffineMatrix(matrix)) {
      this._value = flatten(matrix);
      this.value = flatten(matrix) as number[];
    } else if (isAffineMatrixFlat(matrix)) {
      this._value = matrix;
      this.value = matrix as number[];
    } else {
      throw Error(
        `Cannot concert ${matrix} to TransformMatrix. Please provide an array of length 16 or a nested array 4x4`
      );
    }
  }

  public static getIdentityMatrix() {
    return new TransformMatrix([
      ...[1, 0, 0, 0],
      ...[0, 1, 0, 0],
      ...[0, 0, 1, 0],
      ...[0, 0, 0, 1],
    ]);
  }

  public static getRotationMatrix(angle: number | string, axis: Axis = 'z') {
    const angleValue = getAngle(angle);
    return new TransformMatrix(_getRotationMatrix(angleValue, axis));
  }

  public static getScaleMatrix(scale: number | Vector3D) {
    const [sx, sy, sz] = Array.isArray(scale) ? scale : [scale, scale, scale];

    return new TransformMatrix([
      ...[sx, 0, 0, 0],
      ...[0, sy, 0, 0],
      ...[0, 0, sz, 0],
      ...[0, 0, 0, 1],
    ]);
  }

  public static multiplyMatrices = (a: TransformMatrix, b: TransformMatrix) =>
    new TransformMatrix(_multiplyMatrices(a._value, b._value));

  public multiply(otherMatrix: TransformMatrix) {
    return new TransformMatrix(
      _multiplyMatrices(this._value, otherMatrix._value)
    );
  }

  public static addMatrices = (a: TransformMatrix, b: TransformMatrix) => {
    return new TransformMatrix(_addMatrices(a._value, b._value));
  };

  public add(otherMatrix: TransformMatrix) {
    return new TransformMatrix(_addMatrices(this._value, otherMatrix._value));
  }

  public static subtractMatrices = (a: TransformMatrix, b: TransformMatrix) => {
    return new TransformMatrix(_subtractMatrices(a._value, b._value));
  };

  public subtract(otherMatrix: TransformMatrix) {
    return new TransformMatrix(
      _subtractMatrices(this._value, otherMatrix._value)
    );
  }

  public scale(scaler: number): TransformMatrix {
    return new TransformMatrix(_scaleMatrix(this._value, scaler));
  }
}
