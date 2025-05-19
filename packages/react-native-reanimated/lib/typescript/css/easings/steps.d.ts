import type { NormalizedStepsEasing, ParametrizedTimingFunction, StepsModifier } from './types';
export declare const ERROR_MESSAGES: {
    invalidStepsNumber: (stepsNumber: number) => string;
};
export declare class StepsEasing implements ParametrizedTimingFunction {
    static readonly easingName = "steps";
    readonly stepsNumber: number;
    readonly modifier: StepsModifier;
    constructor(stepsNumber: number, modifier?: StepsModifier);
    toString(): string;
    normalize(): NormalizedStepsEasing | 'linear';
    private jumpNone;
    private jumpStart;
    private jumpEnd;
    private jumpBoth;
    private withName;
}
//# sourceMappingURL=steps.d.ts.map