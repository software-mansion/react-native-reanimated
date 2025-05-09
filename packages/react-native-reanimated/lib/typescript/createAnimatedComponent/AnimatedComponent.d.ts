import '../layoutReanimation/animationsManager';
import type React from 'react';
import type { StyleProps } from '../commonTypes';
import { SkipEnteringContext } from '../component/LayoutAnimationConfig';
import ReanimatedAnimatedComponent from '../css/component/AnimatedComponent';
import type { AnimatedComponentProps, AnimatedComponentRef, AnimatedProps, AnyComponent, IAnimatedComponentInternal, INativeEventsManager, InitialComponentProps, NestedArray } from './commonTypes';
import { InlinePropManager } from './InlinePropManager';
import { PropsFilter } from './PropsFilter';
export type Options<P> = {
    setNativeProps: (ref: AnimatedComponentRef, props: P) => void;
};
export default class AnimatedComponent extends ReanimatedAnimatedComponent<AnimatedComponentProps<InitialComponentProps>> implements IAnimatedComponentInternal {
    _options?: Options<InitialComponentProps>;
    _displayName: string;
    _animatedStyles: StyleProps[];
    _prevAnimatedStyles: StyleProps[];
    _animatedProps?: Partial<AnimatedComponentProps<AnimatedProps>>;
    _isFirstRender: boolean;
    jestInlineStyle: NestedArray<StyleProps> | undefined;
    jestAnimatedStyle: {
        value: StyleProps;
    };
    jestAnimatedProps: {
        value: AnimatedProps;
    };
    _jsPropsUpdater: {
        addOnJSPropsChangeListener(animatedComponent: React.Component<AnimatedComponentProps<InitialComponentProps>, {}, any> & IAnimatedComponentInternal): void;
        removeOnJSPropsChangeListener(animatedComponent: React.Component<AnimatedComponentProps<InitialComponentProps>, {}, any> & IAnimatedComponentInternal): void;
    } | {
        addOnJSPropsChangeListener(_animatedComponent: React.Component<AnimatedComponentProps<InitialComponentProps>, {}, any> & IAnimatedComponentInternal): void;
        removeOnJSPropsChangeListener(_animatedComponent: React.Component<AnimatedComponentProps<InitialComponentProps>, {}, any> & IAnimatedComponentInternal): void;
    };
    _InlinePropManager: InlinePropManager;
    _PropsFilter: PropsFilter;
    _NativeEventsManager?: INativeEventsManager;
    static contextType: React.Context<React.RefObject<boolean> | null>;
    context: React.ContextType<typeof SkipEnteringContext>;
    reanimatedID: number;
    constructor(ChildComponent: AnyComponent, props: AnimatedComponentProps<InitialComponentProps>, displayName: string, options?: Options<InitialComponentProps>);
    componentDidMount(): void;
    componentWillUnmount(): void;
    _detachStyles(): void;
    _updateFromNative(props: StyleProps): void;
    _attachAnimatedStyles(): void;
    componentDidUpdate(prevProps: AnimatedComponentProps<InitialComponentProps>, _prevState: Readonly<unknown>, snapshot: DOMRect | null): void;
    _updateStyles(props: AnimatedComponentProps<InitialComponentProps>): void;
    _configureLayoutTransition(): void;
    _onSetLocalRef(): void;
    getSnapshotBeforeUpdate(): DOMRect | null;
    render(): React.JSX.Element;
}
//# sourceMappingURL=AnimatedComponent.d.ts.map