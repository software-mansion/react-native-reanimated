export type CubicBezierEasingConfig = {
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type LinearEasingInputPoint = number | { y: number; x: `${number}%` };

export type LinearEasingNormalizedPoint = number | { y: number; x: number };

export type LinearEasingProcessedPoint = { y: number; x: number };

export type LinearEasingConfig = {
  name: string;
  pointsX: number[];
  pointsY: number[];
};

export type StepsModifier =
  | 'jumpStart'
  | 'start'
  | 'jumpEnd'
  | 'end'
  | 'jumpNone'
  | 'jumpBoth';

export type StepsEasingConfig = {
  name: string;
  stepsX: number[];
  stepsY: number[];
};
