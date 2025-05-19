/// <reference types="react" />
import type { IAnimatedComponentInternal } from '../createAnimatedComponent/commonTypes';
type HostInstanceFabric = {
    __internalInstanceHandle?: Record<string, unknown>;
    __nativeTag?: number;
    _viewConfig?: Record<string, unknown>;
};
type HostInstancePaper = {
    _nativeTag?: number;
    viewConfig?: Record<string, unknown>;
};
export type HostInstance = HostInstanceFabric & HostInstancePaper;
export declare function findHostInstance(component: IAnimatedComponentInternal | React.Component): HostInstance;
export {};
//# sourceMappingURL=findHostInstance.d.ts.map