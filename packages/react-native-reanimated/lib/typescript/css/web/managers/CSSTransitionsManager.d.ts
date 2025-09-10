import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import type { CSSTransitionProperties, ICSSTransitionsManager } from '../../types';
export default class CSSTransitionsManager implements ICSSTransitionsManager {
    private readonly element;
    private isAttached;
    constructor(element: ReanimatedHTMLElement);
    update(transitionProperties: CSSTransitionProperties | null): void;
    unmountCleanup(): void;
    private detach;
    private setElementTransition;
}
//# sourceMappingURL=CSSTransitionsManager.d.ts.map