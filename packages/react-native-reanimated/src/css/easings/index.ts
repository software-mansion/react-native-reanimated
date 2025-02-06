'use strict';
import { CubicBezierEasing } from './cubicBezier';
import { LinearEasing } from './linear';
import { StepsEasing } from './steps';
import type { ControlPoint, StepsModifier } from './types';

export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  return new CubicBezierEasing(x1, y1, x2, y2);
}

export function steps(
  stepsNumber: number,
  modifier: StepsModifier = 'jump-end'
) {
  return new StepsEasing(stepsNumber, modifier);
}

export function linear(...points: ControlPoint[]) {
  return new LinearEasing(points);
}

export { CubicBezierEasing, LinearEasing, StepsEasing };

export type * from './types';
