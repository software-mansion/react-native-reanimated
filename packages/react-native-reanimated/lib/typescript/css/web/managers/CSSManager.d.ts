import type { ViewInfo } from '../../../createAnimatedComponent/commonTypes';
import type { CSSStyle } from '../../types';
import type { ICSSManager } from '../../types/interfaces';
export default class CSSManager implements ICSSManager {
    private readonly element;
    private readonly animationsManager;
    private readonly transitionsManager;
    constructor(viewInfo: ViewInfo);
    update(style: CSSStyle): void;
    unmountCleanup(): void;
}
//# sourceMappingURL=CSSManager.d.ts.map