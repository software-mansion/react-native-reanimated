/// <reference types="react" />
import type { IAnimatedComponentInternal, IPropsFilter } from './commonTypes';
export declare class PropsFilter implements IPropsFilter {
    private _initialPropsMap;
    filterNonAnimatedProps(component: React.Component<unknown, unknown> & IAnimatedComponentInternal): Record<string, unknown>;
}
//# sourceMappingURL=PropsFilter.d.ts.map