import type { AnyRecord, CSSAnimationKeyframes, CSSAnimationKeyframeSelector } from '../../../types';
import type { StyleBuilder } from '../../style';
import type { NormalizedCSSAnimationKeyframesConfig } from '../../types';
export declare const ERROR_MESSAGES: {
    invalidOffsetType: (selector: CSSAnimationKeyframeSelector) => string;
    invalidOffsetRange: (selector: CSSAnimationKeyframeSelector) => string;
};
export declare function normalizeAnimationKeyframes(keyframes: CSSAnimationKeyframes, styleBuilder: StyleBuilder<AnyRecord>): NormalizedCSSAnimationKeyframesConfig;
//# sourceMappingURL=keyframes.d.ts.map