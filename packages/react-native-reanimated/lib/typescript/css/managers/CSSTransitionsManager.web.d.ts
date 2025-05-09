import type { ReanimatedHTMLElement } from '../../ReanimatedModule/js-reanimated';
import type { CSSTransitionProperties } from '../types';
import type { ICSSTransitionsManager } from '../types/interfaces';
export default class CSSTransitionsManager implements ICSSTransitionsManager {
    private readonly element;
    constructor(element: ReanimatedHTMLElement);
    update(transitionProperties: CSSTransitionProperties | null): void;
    unmountCleanup(): void;
    private detach;
    private setElementTransition;
}
//# sourceMappingURL=CSSTransitionsManager.web.d.ts.map