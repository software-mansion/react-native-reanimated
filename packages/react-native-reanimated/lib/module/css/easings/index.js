'use strict';

import { CubicBezierEasing } from "./cubicBezier.js";
import { LinearEasing } from "./linear.js";
import { StepsEasing } from "./steps.js";
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