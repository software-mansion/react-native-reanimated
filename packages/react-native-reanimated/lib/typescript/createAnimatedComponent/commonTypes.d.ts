import type { Component, Ref, RefObject } from 'react';
import type { AnimatedStyle, EntryExitAnimationFunction, ILayoutAnimationBuilder, ShadowNodeWrapper, SharedValue, StyleProps, StyleUpdaterContainer } from '../commonTypes';
import type { SkipEnteringContext } from '../component/LayoutAnimationConfig';
import type { BaseAnimationBuilder } from '../layoutReanimation';
import type { ViewDescriptorsSet } from '../ViewDescriptorsSet';
export interface AnimatedProps extends Record<string, unknown> {
    viewDescriptors?: ViewDescriptorsSet;
    initial?: SharedValue<StyleProps>;
    styleUpdaterContainer?: StyleUpdaterContainer;
}
export interface ViewInfo {
    viewTag: number | AnimatedComponentRef | HTMLElement | null;
    shadowNodeWrapper: ShadowNodeWrapper | null;
    viewName?: string;
    DOMElement?: HTMLElement | null;
}
export interface IInlinePropManager {
    attachInlineProps(animatedComponent: React.Component<unknown, unknown>, viewInfo: ViewInfo): void;
    detachInlineProps(): void;
}
export type AnimatedComponentType = React.Component<unknown, unknown> & IAnimatedComponentInternal;
export type PropUpdates = StyleProps | AnimatedStyle<any>;
export interface IPropsFilter {
    filterNonAnimatedProps: (component: AnimatedComponentType) => Record<string, unknown>;
}
export type JSPropsOperation = {
    tag: number;
    updates: StyleProps;
};
export interface IJSPropsUpdater {
    registerComponent(animatedComponent: AnimatedComponentType, jsProps: string[]): void;
    unregisterComponent(animatedComponent: AnimatedComponentType): void;
    updateProps(operations: JSPropsOperation[]): void;
}
export interface INativeEventsManager {
    attachEvents(): void;
    detachEvents(): void;
    updateEvents(prevProps: AnimatedComponentProps<InitialComponentProps>): void;
}
export type LayoutAnimationStaticContext = {
    presetName: string;
};
export type AnimatedComponentProps<P extends Record<string, unknown> = Record<string, unknown>> = P & {
    ref?: Ref<Component>;
    style?: NestedArray<StyleProps>;
    animatedProps?: Partial<AnimatedComponentProps<AnimatedProps>>;
    jestAnimatedValues?: RefObject<AnimatedProps>;
    animatedStyle?: StyleProps;
    layout?: (BaseAnimationBuilder | ILayoutAnimationBuilder | typeof BaseAnimationBuilder) & LayoutAnimationStaticContext;
    entering?: (BaseAnimationBuilder | typeof BaseAnimationBuilder | EntryExitAnimationFunction | Keyframe) & LayoutAnimationStaticContext;
    exiting?: (BaseAnimationBuilder | typeof BaseAnimationBuilder | EntryExitAnimationFunction | Keyframe) & LayoutAnimationStaticContext;
};
export type LayoutAnimationOrBuilder = (BaseAnimationBuilder | typeof BaseAnimationBuilder | EntryExitAnimationFunction | Keyframe | ILayoutAnimationBuilder) & LayoutAnimationStaticContext;
export interface AnimatedComponentRef extends Component {
    setNativeProps?: (props: Record<string, unknown>) => void;
    getScrollableNode?: () => AnimatedComponentRef;
    getAnimatableRef?: () => AnimatedComponentRef;
    elementRef?: React.RefObject<HTMLElement>;
}
export interface IAnimatedComponentInternalBase {
    ChildComponent: AnyComponent;
    _componentRef: AnimatedComponentRef | HTMLElement | null;
    _hasAnimatedRef: boolean;
    _viewInfo?: ViewInfo;
    /**
     * Used for Layout Animations and Animated Styles. It is not related to event
     * handling.
     */
    getComponentViewTag: () => number;
}
export interface IAnimatedComponentInternal extends IAnimatedComponentInternalBase {
    _animatedStyles: StyleProps[];
    _prevAnimatedStyles: StyleProps[];
    _animatedProps: Partial<AnimatedComponentProps<AnimatedProps>>[];
    _prevAnimatedProps: Partial<AnimatedComponentProps<AnimatedProps>>[];
    _isFirstRender: boolean;
    jestInlineStyle: NestedArray<StyleProps> | undefined;
    jestAnimatedStyle: {
        value: StyleProps;
    };
    jestAnimatedProps: {
        value: AnimatedProps;
    };
    _InlinePropManager: IInlinePropManager;
    _PropsFilter: IPropsFilter;
    /** Doesn't exist on web. */
    _NativeEventsManager?: INativeEventsManager;
    context: React.ContextType<typeof SkipEnteringContext>;
    setNativeProps: (props: StyleProps) => void;
}
export type NestedArray<T> = T | NestedArray<T>[];
export type AnyComponent = React.ComponentType<any>;
export interface InitialComponentProps extends Record<string, unknown> {
    ref?: Ref<Component>;
    collapsable?: boolean;
}
export type ManagedAnimatedComponent = React.Component<AnimatedComponentProps<InitialComponentProps>> & IAnimatedComponentInternal;
//# sourceMappingURL=commonTypes.d.ts.map