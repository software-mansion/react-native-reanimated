import type { CSSAnimationKeyframes, CSSKeyframesRule, PlainStyle } from '../types';
export default function keyframes<S extends PlainStyle>(keyframeDefinitions: CSSAnimationKeyframes<Pick<S, keyof PlainStyle>> & CSSAnimationKeyframes<PlainStyle>): CSSKeyframesRule;
//# sourceMappingURL=keyframes.d.ts.map