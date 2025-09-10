import type { StyleProps } from '../commonTypes';
import type { ViewDescriptorsSet } from '../ViewDescriptorsSet';
import type { AnimatedComponentType, IInlinePropManager, ViewInfo } from './commonTypes';
export declare function hasInlineStyles(style: StyleProps): boolean;
export declare function getInlineStyle(style: Record<string, unknown>, isFirstRender: boolean): StyleProps | Record<string, unknown>;
export declare class InlinePropManager implements IInlinePropManager {
    _inlinePropsViewDescriptors: ViewDescriptorsSet | null;
    _inlinePropsMapperId: number | null;
    _inlineProps: StyleProps;
    attachInlineProps(animatedComponent: AnimatedComponentType, viewInfo: ViewInfo): void;
    detachInlineProps(): void;
}
//# sourceMappingURL=InlinePropManager.d.ts.map