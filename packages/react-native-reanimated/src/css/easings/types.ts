'use strict';

export type NormalizedCubicBezierEasing = {
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type NormalizedLinearEasing = {
  name: string;
  pointsX: number[];
  pointsY: number[];
};

export type NormalizedStepsEasing = {
  name: string;
  stepsX: number[];
  stepsY: number[];
};

export type LinearEasingInputPoint = number | { y: number; x: `${number}%` };

export type LinearEasingNormalizedPoint = number | { y: number; x: number };

export type LinearEasingProcessedPoint = { y: number; x: number };

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
  | ParametrizedTimingFunction;

export type NormalizedCSSTimingFunction =
  | PredefinedTimingFunction
  | NormalizedCubicBezierEasing
  | NormalizedLinearEasing
  | NormalizedStepsEasing;

export interface ParametrizedTimingFunction {
  toString(): string;
  normalize(): NormalizedCSSTimingFunction;
}
