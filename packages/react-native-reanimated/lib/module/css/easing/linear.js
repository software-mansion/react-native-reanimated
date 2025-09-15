'use strict';

import { logger, ReanimatedError } from '../../common';
import { PERCENTAGE_REGEX } from '../constants';
export const ERROR_MESSAGES = {
  invalidPointsCount: () => `Invalid linear easing points count. There should be at least two points`,
  invalidInputProgressValue: inputProgress => `Invalid input progress ${inputProgress} value, it should be a percentage between 0% and 100%`
};
export const WARN_MESSAGES = {
  inputProgressLessThanPrecedingPoint: (x, precedingX) => `Linear easing point x value ${x} is less than value of the preceding control point ${precedingX}. Value will be overridden by ${precedingX}`
};
const parsePercentage = percentage => {
  let result;
  if (typeof percentage === 'number') {
    result = percentage;
  } else if (PERCENTAGE_REGEX.test(percentage)) {
    result = parseFloat(percentage) / 100;
  }
  if (result === undefined || result < 0 || result > 1) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidInputProgressValue(percentage));
  }
  return result;
};
const extrapolate = (x, point1, point2) => {
  const slope = (point2.y - point1.y) / (point2.x - point1.x);
  return point1.y + slope * (x - point1.x);
};
export class LinearEasing {
  static easingName = 'linear';
  constructor(points) {
    if (points.length < 2) {
      throw new ReanimatedError(ERROR_MESSAGES.invalidPointsCount());
    }
    this.points = points.map(p => Array.isArray(p) && p.length === 1 ? p[0] : p);
  }
  toString() {
    return `${LinearEasing.easingName}(${this.points.map(point => Array.isArray(point) ? `[${point.map(p => typeof p === 'string' ? `"${p}"` : p).join(', ')}]` : point).join(', ')})`;
  }
  normalize() {
    const points = this.canonicalize();

    // Extrapolate points if the input progress of the first one is greater than 0
    // or the input progress of the last one is less than 1
    if (points[0].x > 0) {
      points.unshift({
        x: 0,
        y: extrapolate(0, points[0], points[1])
      });
    }
    if (points[points.length - 1].x < 1) {
      points.push({
        x: 1,
        y: extrapolate(1, points[points.length - 2], points[points.length - 1])
      });
    }
    return {
      name: LinearEasing.easingName,
      points
    };
  }
  canonicalize() {
    const result = this.points.flatMap(point => Array.isArray(point) ? point.slice(1).map(x => ({
      x: parsePercentage(x),
      y: point[0]
    })) : [{
      y: point
    }]);

    // 1. If the first control point lacks an input progress value,
    // set its input progress value to 0.
    if (result[0].x === undefined) {
      result[0].x = 0;
    }

    // 2.If the last control point lacks an input progress value,
    // set its input progress value to 1.
    if (result[result.length - 1].x === undefined) {
      result[result.length - 1].x = 1;
    }

    // 3. If any control point has an input progress value that is less
    // than the input progress value of any preceding control point, set
    // its input progress value to the largest input progress value of
    // any preceding control point.
    let maxPrecedingX = 0;
    for (let i = 1; i < result.length - 1; i++) {
      const x = result[i].x;
      if (x !== undefined) {
        if (x < maxPrecedingX) {
          logger.warn(WARN_MESSAGES.inputProgressLessThanPrecedingPoint(x, maxPrecedingX));
          result[i].x = maxPrecedingX;
        } else {
          maxPrecedingX = x;
        }
      }
    }

    // 4. If any control point still lacks an input progress value, then
    // for each contiguous run of such control points, set their input
    // progress values so that they are evenly spaced between the preceding
    // and following control points with input progress values.
    let precedingX = result[0].x;
    let missingCount = 0;
    for (let i = 1; i < result.length; i++) {
      const x = result[i].x;
      if (x === undefined) {
        missingCount++;
        continue;
      }
      if (missingCount > 0) {
        const range = x - precedingX;
        for (let j = 0; j < missingCount; j++) {
          result[i - missingCount + j].x = precedingX + range * (j + 1) / (missingCount + 1);
        }
      }
      precedingX = x;
      missingCount = 0;
    }
    return result;
  }
}
//# sourceMappingURL=linear.js.map