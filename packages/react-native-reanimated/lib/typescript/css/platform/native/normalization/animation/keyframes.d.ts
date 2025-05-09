import type { CSSAnimationKeyframes, CSSAnimationKeyframeSelector } from '../../../../types';
import type { NormalizedCSSAnimationKeyframesConfig } from '../../types';
export declare const ERROR_MESSAGES: {
    invalidOffsetType: (selector: CSSAnimationKeyframeSelector) => string;
    invalidOffsetRange: (selector: CSSAnimationKeyframeSelector) => string;
};
export declare function normalizeAnimationKeyframes(keyframes: CSSAnimationKeyframes): NormalizedCSSAnimationKeyframesConfig;
//# sourceMappingURL=keyframes.d.ts.map