'use strict';

import { CubicBezierEasing } from './cubicBezier';
import { LinearEasing } from './linear';
import { StepsEasing } from './steps';
export function cubicBezier(x1, y1, x2, y2) {
  return new CubicBezierEasing(x1, y1, x2, y2);
}
export function steps(stepsNumber, modifier = 'jump-end') {
  return new StepsEasing(stepsNumber, modifier);
}
export function linear(...points) {
  return new LinearEasing(points);
}
export { CubicBezierEasing, LinearEasing, StepsEasing };
//# sourceMappingURL=index.js.map