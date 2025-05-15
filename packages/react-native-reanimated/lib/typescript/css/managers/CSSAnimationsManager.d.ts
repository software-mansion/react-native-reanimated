import type { ShadowNodeWrapper } from '../../commonTypes';
import { CSSKeyframesRegistry } from '../registry';
import type { ExistingCSSAnimationProperties } from '../types';
import type { ICSSAnimationsManager } from '../types/interfaces';
export default class CSSAnimationsManager implements ICSSAnimationsManager {
    private readonly viewTag;
    private readonly shadowNodeWrapper;
    static readonly animationKeyframesRegistry: CSSKeyframesRegistry;
    private attachedAnimations;
    constructor(shadowNodeWrapper: ShadowNodeWrapper, viewTag: number);
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