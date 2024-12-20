'use strict';
import type { Percentage, Point } from '../types';
import type { CubicBezierEasing } from './cubicBezier';
import type { LinearEasing } from './linear';
import type { StepsEasing } from './steps';

export type NormalizedCubicBezierEasing = {
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type NormalizedLinearEasing = {
  name: string;
  points: Point[];
};

export type NormalizedStepsEasing = {
  name: string;
  points: Point[];
};

export type ControlPoint = number | [number, ...Percentage[]];

export type StepsModifier =
  | 'jumpStart'
  | 'start'
  | 'jumpEnd'
  | 'end'
  | 'jumpNone'
  | 'jumpBoth';

export type PredefinedTimingFunction =
  | 'linear'
  | 'ease'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'stepStart'
  | 'stepEnd';

export type CSSTimingFunction =
  | PredefinedTimingFunction
  | CubicBezierEasing
  | LinearEasing
  | StepsEasing;

export type NormalizedCSSTimingFunction =
  | PredefinedTimingFunction
  | NormalizedCubicBezierEasing
  | NormalizedLinearEasing
  | NormalizedStepsEasing;

export interface ParametrizedTimingFunction {
  toString(): string;
  normalize(): NormalizedCSSTimingFunction;
}
