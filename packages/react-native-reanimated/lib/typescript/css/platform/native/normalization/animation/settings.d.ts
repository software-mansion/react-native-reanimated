import type { CSSAnimationDirection, CSSAnimationFillMode, CSSAnimationIterationCount, CSSAnimationPlayState, SingleCSSAnimationSettings } from '../../../../types';
import type { NormalizedSingleCSSAnimationSettings } from '../../types';
export declare const ERROR_MESSAGES: {
    invalidAnimationDirection: (direction: CSSAnimationDirection) => string;
    invalidIterationCount: (iterationCount: CSSAnimationIterationCount) => string;
    negativeIterationCount: (iterationCount: number) => string;
    invalidFillMode: (fillMode: CSSAnimationFillMode) => string;
    invalidPlayState: (playState: CSSAnimationPlayState) => string;
};
export declare function normalizeDirection(direction?: CSSAnimationDirection): CSSAnimationDirection;
export declare function normalizeIterationCount(iterationCount?: CSSAnimationIterationCount): number;
export declare function normalizeFillMode(fillMode?: CSSAnimationFillMode): CSSAnimationFillMode;
export declare function normalizePlayState(playState?: CSSAnimationPlayState): CSSAnimationPlayState;
export declare function normalizeSingleCSSAnimationSettings({ animationDuration, animationTimingFunction, animationDelay, animationIterationCount, animationDirection, animationFillMode, animationPlayState, }: SingleCSSAnimationSettings): NormalizedSingleCSSAnimationSettings;
export declare function getAnimationSettingsUpdates(oldConfig: NormalizedSingleCSSAnimationSettings, newConfig: NormalizedSingleCSSAnimationSettings): Partial<NormalizedSingleCSSAnimationSettings>;
//# sourceMappingURL=settings.d.ts.map