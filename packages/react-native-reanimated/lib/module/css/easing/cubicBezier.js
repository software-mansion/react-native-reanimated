'use strict';

import { ReanimatedError } from "../../common/index.js";
export const ERROR_MESSAGES = {
  invalidCoordinate: (coordinate, value) => `Invalid ${coordinate} coordinate for cubic bezier easing point, it should be a number between 0 and 1, received ${value}`
};
export class CubicBezierEasing {
  static easingName = 'cubicBezier';
  constructor(x1, y1, x2, y2) {
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
  toString() {
    return `${CubicBezierEasing.easingName}(${this.x1}, ${this.y1}, ${this.x2}, ${this.y2})`;
  }
  normalize() {
    return {
      name: CubicBezierEasing.easingName,
      x1: this.x1,
      y1: this.y1,
      x2: this.x2,
      y2: this.y2
    };
  }
}
//# sourceMappingURL=cubicBezier.js.map