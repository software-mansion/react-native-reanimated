import type { WrapperRef } from '../commonTypes';
import type { IAnimatedComponentInternalBase } from '../createAnimatedComponent/commonTypes';
export type HostInstance = {
    __internalInstanceHandle?: Record<string, unknown>;
    __nativeTag?: number;
    _viewConfig?: Record<string, unknown>;
};
export declare function findHostInstance(ref: IAnimatedComponentInternalBase | WrapperRef): HostInstance;
//# sourceMappingURL=findHostInstance.d.ts.map