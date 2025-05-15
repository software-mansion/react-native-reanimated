import type { NormalizedCSSAnimationKeyframesConfig } from '../platform/native';
import type { CSSAnimationKeyframes, PlainStyle } from '../types';
import CSSKeyframesRuleBase from './CSSKeyframesRuleBase';
export default class CSSKeyframesRuleImpl<S extends PlainStyle = PlainStyle> extends CSSKeyframesRuleBase<S> {
    private normalizedKeyframes_;
    constructor(keyframes: CSSAnimationKeyframes<S>);
    get normalizedKeyframesConfig(): NormalizedCSSAnimationKeyframesConfig;
}
//# sourceMappingURL=CSSKeyframesRule.d.ts.map