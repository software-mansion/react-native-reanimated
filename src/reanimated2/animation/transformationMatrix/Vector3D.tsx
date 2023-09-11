import type { Vector3DType } from './matrixUtils';

// ts-prune-ignore-next
export class Vector3D {
  value: Vector3DType;

  constructor(vector: Array<number>) {
    if (Array.isArray(vector) && vector.length === 3) {
      this.value = vector as Vector3DType;
    } else {
      throw Error(
        `Cannot convert ${vector} to TransformMatrix. Please provide an array of length 16 or a nested array 4x4`
      );
    }
  }
}
