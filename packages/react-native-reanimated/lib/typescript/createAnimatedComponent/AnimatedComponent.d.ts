import '../layoutReanimation/animationsManager';
import type React from 'react';
import type { StyleProps } from '../commonTypes';
import { LayoutAnimationType } from '../commonTypes';
import { SkipEnteringContext } from '../component/LayoutAnimationConfig';
import ReanimatedAnimatedComponent from '../css/component/AnimatedComponent';
import type { AnimatedComponentProps, AnimatedComponentRef, AnimatedProps, AnyComponent, IAnimatedComponentInternal, INativeEventsManager, InitialComponentProps, LayoutAnimationOrBuilder, NestedArray } from './commonTypes';
import { InlinePropManager } from './InlinePropManager';
import { PropsFilter } from './PropsFilter';
export type Options<P> = {
    setNativeProps?: (ref: AnimatedComponentRef, props: P) => void;
    jsProps?: string[];
};
export default class AnimatedComponent extends ReanimatedAnimatedComponent<AnimatedComponentProps<InitialComponentProps>> implements IAnimatedComponentInternal {
    _options?: Options<InitialComponentProps>;
    _displayName: string;
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
    setNativeProps(props: StyleProps): void;
    _handleAnimatedStylesUpdate(prevStyles: StyleProps[], currentStyles: StyleProps[], jestAnimatedStyleOrProps: {
        value: StyleProps;
    }): void;
    _updateAnimatedStylesAndProps(): void;
    componentDidUpdate(prevProps: AnimatedComponentProps<InitialComponentProps>, _prevState: Readonly<unknown>, snapshot: DOMRect | null): void;
    _updateStyles(props: AnimatedComponentProps<InitialComponentProps>): void;
    _configureLayoutAnimation(type: LayoutAnimationType, currentConfig: LayoutAnimationOrBuilder | undefined, previousConfig?: LayoutAnimationOrBuilder): void;
    getSnapshotBeforeUpdate(): DOMRect | null;
    render(): React.JSX.Element;
}
//# sourceMappingURL=AnimatedComponent.d.ts.map