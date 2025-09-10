import type { ControlPoint, NormalizedLinearEasing, ParametrizedTimingFunction } from './types';
export declare const ERROR_MESSAGES: {
    invalidPointsCount: () => string;
    invalidInputProgressValue: (inputProgress: string | number) => string;
};
export declare const WARN_MESSAGES: {
    inputProgressLessThanPrecedingPoint: (x: number, precedingX: number) => string;
};
export declare class LinearEasing implements ParametrizedTimingFunction {
    static readonly easingName = "linear";
    readonly points: ControlPoint[];
    constructor(points: ControlPoint[]);
    toString(): string;
    normalize(): NormalizedLinearEasing;
    private canonicalize;
}
//# sourceMappingURL=linear.d.ts.map