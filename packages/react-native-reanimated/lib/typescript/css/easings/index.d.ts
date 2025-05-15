import { CubicBezierEasing } from './cubicBezier';
import { LinearEasing } from './linear';
import { StepsEasing } from './steps';
import type { ControlPoint, StepsModifier } from './types';
export declare function cubicBezier(x1: number, y1: number, x2: number, y2: number): CubicBezierEasing;
export declare function steps(stepsNumber: number, modifier?: StepsModifier): StepsEasing;
export declare function linear(...points: ControlPoint[]): LinearEasing;
export { CubicBezierEasing, LinearEasing, StepsEasing };
export type * from './types';
//# sourceMappingURL=index.d.ts.map