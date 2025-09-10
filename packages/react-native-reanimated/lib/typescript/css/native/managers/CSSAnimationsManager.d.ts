import type { ShadowNodeWrapper } from '../../../commonTypes';
import type { ExistingCSSAnimationProperties, ICSSAnimationsManager } from '../../types';
export default class CSSAnimationsManager implements ICSSAnimationsManager {
    private readonly shadowNodeWrapper;
    private readonly viewName;
    private readonly viewTag;
    private attachedAnimations;
    constructor(shadowNodeWrapper: ShadowNodeWrapper, viewName: string, viewTag: number);
    update(animationProperties: ExistingCSSAnimationProperties | null): void;
    unmountCleanup(): void;
    private detach;
    private registerKeyframesUsage;
    private unregisterKeyframesUsage;
    private processAnimations;
    private buildAnimationsMap;
    private getAnimationUpdates;
}
//# sourceMappingURL=CSSAnimationsManager.d.ts.map