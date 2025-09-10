import type { CSSTimingFunction, NormalizedCSSTimingFunction, PredefinedTimingFunction } from '../../../easing';
import type { TimeUnit } from '../../../types';
export declare const ERROR_MESSAGES: {
    invalidDelay: (timeUnit: TimeUnit) => string;
    invalidDuration: (duration: TimeUnit) => string;
    negativeDuration: (duration: TimeUnit) => string;
    invalidPredefinedTimingFunction: (timingFunction: PredefinedTimingFunction) => string;
    invalidParametrizedTimingFunction: (timingFunction: CSSTimingFunction) => string;
};
export declare function normalizeDelay(delay?: TimeUnit): number;
export declare function normalizeDuration(duration?: TimeUnit): number;
export declare function normalizeTimingFunction(timingFunction?: CSSTimingFunction): NormalizedCSSTimingFunction;
//# sourceMappingURL=settings.d.ts.map