import type { CSSAnimationKeyframes, PlainStyle } from '../types';
import CSSKeyframesRuleBase from './CSSKeyframesRuleBase';
export default class CSSKeyframesRuleImpl<S extends PlainStyle = PlainStyle> extends CSSKeyframesRuleBase<S> {
    private processedKeyframes_;
    constructor(keyframes: CSSAnimationKeyframes<S>, processedKeyframes?: string);
    get processedKeyframes(): string;
}
//# sourceMappingURL=CSSKeyframesRule.web.d.ts.map