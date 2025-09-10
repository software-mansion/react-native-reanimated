import type { ViewInfo } from '../../../createAnimatedComponent/commonTypes';
import type { CSSStyle } from '../../types';
import type { ICSSManager } from '../../types/interfaces';
export default class CSSManager implements ICSSManager {
    private readonly cssAnimationsManager;
    private readonly cssTransitionsManager;
    private readonly viewTag;
    private readonly viewName;
    private readonly styleBuilder;
    private isFirstUpdate;
    constructor({ shadowNodeWrapper, viewTag, viewName }: ViewInfo);
    update(style: CSSStyle): void;
    unmountCleanup(): void;
}
//# sourceMappingURL=CSSManager.d.ts.map