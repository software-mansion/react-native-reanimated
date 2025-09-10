import { CSSKeyframesRuleBase } from '../../models';
import type { CSSAnimationKeyframes, PlainStyle } from '../../types';
export default class CSSKeyframesRuleImpl<S extends PlainStyle = PlainStyle> extends CSSKeyframesRuleBase<S> {
    private processedKeyframes_;
    constructor(keyframes: CSSAnimationKeyframes<S>, processedKeyframes?: string);
    get processedKeyframes(): string;
}
//# sourceMappingURL=CSSKeyframesRuleImpl.d.ts.map