import type { NormalizedCubicBezierEasing, ParametrizedTimingFunction } from './types';
export declare const ERROR_MESSAGES: {
    invalidCoordinate: (coordinate: string, value: number) => string;
};
export declare class CubicBezierEasing implements ParametrizedTimingFunction {
    static readonly easingName = "cubicBezier";
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
    constructor(x1: number, y1: number, x2: number, y2: number);
    toString(): string;
    normalize(): NormalizedCubicBezierEasing;
}
//# sourceMappingURL=cubicBezier.d.ts.map