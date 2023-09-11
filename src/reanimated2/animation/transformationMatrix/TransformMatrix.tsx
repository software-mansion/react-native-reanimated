import type { AffineMatrix, AffineMatrixFlat, Axis } from './matrixUtils';
import {
  _addMatrices,
  _multiplyMatrices,
  _subtractMatrices,
  flatten,
  isAffineMatrix,
  isAffineMatrixFlat,
  _scaleMatrix,
  unflatten,
  _getRotationMatrix,
} from './matrixUtils';

// ╔═══════════════════════════╗
// ║  This is part of the API  ║ // SOON ;-)
// ╚═══════════════════════════╝

function getAngle(angle: number | string) {
  if (typeof angle === 'number') {
    return angle;
  }
  const angleRegex = /^(?<value>\d+)deg/;
  const numberAsString = angle.match(angleRegex)?.groups?.value;
  if (!numberAsString) {
    throw Error(`Unable to understand angle ${numberAsString}`);
  }

  return Math.PI * 2 * (Number(numberAsString) / 360);
}

export class TransformMatrix {
  value: AffineMatrix;
  valueFlat: AffineMatrixFlat;

  constructor(matrix: Array<Array<number>> | Array<number> | AffineMatrixFlat) {
    if (isAffineMatrix(matrix)) {
      this.value = matrix;
      this.valueFlat = flatten(matrix);
    } else if (isAffineMatrixFlat(matrix)) {
      this.value = unflatten(matrix);
      this.valueFlat = matrix;
    } else {
      throw Error(
        `Cannot concert ${matrix} to TransformMatrix. Please provide an array of length 16 or a nested array 4x4`
      );
    }
  }

  public static getRotationMatrix(angle: number | string, axis: Axis = 'z') {
    const angleValue = getAngle(angle);
    return _getRotationMatrix(angleValue, axis);
  }

  public static multiplyMatrices = (a: TransformMatrix, b: TransformMatrix) =>
    new TransformMatrix(_multiplyMatrices(a.valueFlat, b.valueFlat));

  public multiply(otherMatrix: TransformMatrix) {
    return new TransformMatrix(
      _multiplyMatrices(this.valueFlat, otherMatrix.valueFlat)
    );
  }

  public static addMatrices = (a: TransformMatrix, b: TransformMatrix) => {
    return new TransformMatrix(_addMatrices(a.valueFlat, b.valueFlat));
  };

  public add(otherMatrix: TransformMatrix) {
    return new TransformMatrix(
      _addMatrices(this.valueFlat, otherMatrix.valueFlat)
    );
  }

  public static subtractMatrices = (a: TransformMatrix, b: TransformMatrix) => {
    return new TransformMatrix(_subtractMatrices(a.valueFlat, b.valueFlat));
  };

  public subtract(otherMatrix: TransformMatrix) {
    return new TransformMatrix(
      _subtractMatrices(this.valueFlat, otherMatrix.valueFlat)
    );
  }

  public scale(scaler: number): TransformMatrix {
    return new TransformMatrix(_scaleMatrix(this.valueFlat, scaler));
  }
}
