import type { ReanimatedHTMLElement } from '../../ReanimatedModule/js-reanimated';
import CSSKeyframesRuleImpl from '../models/CSSKeyframesRule.web';
import type { ExistingCSSAnimationProperties } from '../types';
import type { ICSSAnimationsManager } from '../types/interfaces';
export declare const isCSSKeyframesRuleImpl: (keyframes: ExistingCSSAnimationProperties['animationName']) => keyframes is CSSKeyframesRuleImpl<import("../types").PlainStyle>;
export default class CSSAnimationsManager implements ICSSAnimationsManager {
    private readonly element;
    private attachedAnimations;
    constructor(element: ReanimatedHTMLElement);
    update(animationProperties: ExistingCSSAnimationProperties | null): void;
    unmountCleanup(): void;
    private detach;
    private updateAttachedAnimations;
    private setElementAnimations;
}
//# sourceMappingURL=CSSAnimationsManager.web.d.ts.map