'use strict';
import { ReanimatedError } from '../../errors';
import type {
  NormalizedCubicBezierEasing,
  ParametrizedTimingFunction,
} from './types';

const ERROR_MESSAGES = {
  invalidCoordinate: (coordinate: string, value: number) =>
    `Invalid ${coordinate} coordinate for cubic bezier easing point, it should be a number between 0 and 1, received ${value}`,
};

export class CubicBezierEasing implements ParametrizedTimingFunction {
  static readonly easingName = 'cubicBezier';
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;

  constructor(x1: number, y1: number, x2: number, y2: number) {
    if (x1 < 0 || x1 > 1) {
      throw new ReanimatedError(ERROR_MESSAGES.invalidCoordinate('x1', x1));
    }
    if (x2 < 0 || x2 > 1) {
      throw new ReanimatedError(ERROR_MESSAGES.invalidCoordinate('x2', x2));
    }
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  toString(): string {
    return `${CubicBezierEasing.easingName}(${this.x1}, ${this.y1}, ${this.x2}, ${this.y2})`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  equals(other: any): other is this {
    return (
      other instanceof CubicBezierEasing &&
      this.x1 === other.x1 &&
      this.y1 === other.y1 &&
      this.x2 === other.x2 &&
      this.y2 === other.y2
    );
  }

  normalize(): NormalizedCubicBezierEasing {
    return {
      name: CubicBezierEasing.easingName,
      x1: this.x1,
      y1: this.y1,
      x2: this.x2,
      y2: this.y2,
    };
  }
}
