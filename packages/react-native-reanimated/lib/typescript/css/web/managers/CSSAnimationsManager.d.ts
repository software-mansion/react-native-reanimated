import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import type { ExistingCSSAnimationProperties, ICSSAnimationsManager } from '../../types';
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
//# sourceMappingURL=CSSAnimationsManager.d.ts.map