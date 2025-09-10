import { CSSKeyframesRuleBase } from '../../models';
import type { CSSAnimationKeyframes, PlainStyle } from '../../types';
import type { NormalizedCSSAnimationKeyframesConfig } from '../types';
export default class CSSKeyframesRuleImpl<S extends PlainStyle = PlainStyle> extends CSSKeyframesRuleBase<S> {
    private readonly normalizedKeyframesCache_;
    constructor(keyframes: CSSAnimationKeyframes<S>, cssText?: string);
    getNormalizedKeyframesConfig(viewName: string): NormalizedCSSAnimationKeyframesConfig;
}
//# sourceMappingURL=CSSKeyframesRuleImpl.d.ts.map