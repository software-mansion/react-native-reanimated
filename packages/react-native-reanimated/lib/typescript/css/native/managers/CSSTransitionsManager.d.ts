import type { ShadowNodeWrapper } from '../../../commonTypes';
import type { CSSTransitionProperties, ICSSTransitionsManager } from '../../types';
export default class CSSTransitionsManager implements ICSSTransitionsManager {
    private readonly viewTag;
    private readonly shadowNodeWrapper;
    private transitionConfig;
    constructor(shadowNodeWrapper: ShadowNodeWrapper, viewTag: number);
    update(transitionProperties: CSSTransitionProperties | null): void;
    unmountCleanup(): void;
    private detach;
    private attachTransition;
}
//# sourceMappingURL=CSSTransitionsManager.d.ts.map