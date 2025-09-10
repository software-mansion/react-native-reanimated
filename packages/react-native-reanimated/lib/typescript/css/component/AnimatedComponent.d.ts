import type { ComponentProps, Ref } from 'react';
import { Component } from 'react';
import type { StyleProp } from 'react-native';
import type { AnimatedComponentRef, IAnimatedComponentInternalBase, ViewInfo } from '../../createAnimatedComponent/commonTypes';
import { CSSManager } from '../platform';
import type { AnyComponent, AnyRecord, CSSStyle, PlainStyle } from '../types';
export type AnimatedComponentProps = Record<string, unknown> & {
    ref?: Ref<Component>;
    style?: StyleProp<PlainStyle>;
};
export default class AnimatedComponent<P extends AnyRecord = AnimatedComponentProps> extends Component<P> implements IAnimatedComponentInternalBase {
    ChildComponent: AnyComponent;
    _CSSManager?: CSSManager;
    _viewInfo?: ViewInfo;
    _cssStyle: CSSStyle;
    _componentRef: AnimatedComponentRef | HTMLElement | null;
    _hasAnimatedRef: boolean;
    _componentDOMRef: HTMLElement | null;
    _willUnmount: boolean;
    constructor(ChildComponent: AnyComponent, props: P);
    getComponentViewTag(): number;
    _onSetLocalRef(): void;
    _getViewInfo(): ViewInfo;
    _setComponentRef: (ref: Component | HTMLElement) => void;
    _resolveComponentRef: (ref: Component | HTMLElement | null) => AnimatedComponentRef;
    _updateStyles(props: P): void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    shouldComponentUpdate(nextProps: P): boolean;
    render(props?: ComponentProps<AnyComponent>): import("react").JSX.Element;
}
//# sourceMappingURL=AnimatedComponent.d.ts.map