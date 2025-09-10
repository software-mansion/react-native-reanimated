import type { CSSAnimationKeyframes, CSSKeyframesRule, PlainStyle } from '../types';
export default abstract class CSSKeyframesRuleBase<S extends PlainStyle> implements CSSKeyframesRule {
    private static currentAnimationID;
    private readonly cssRules_;
    private readonly cssText_;
    private readonly length_;
    private readonly name_;
    constructor(keyframes: CSSAnimationKeyframes<S>, cssText?: string);
    get cssRules(): CSSAnimationKeyframes<S>;
    get cssText(): string;
    get length(): number;
    get name(): string;
    static generateNextKeyframeName(): string;
}
//# sourceMappingURL=CSSKeyframesRuleBase.d.ts.map