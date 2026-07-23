'use strict';
import type { ComponentProps, Ref } from 'react';
import { Component } from 'react';
import type { StyleProp } from 'react-native';
import { Platform, StyleSheet } from 'react-native';

import type { AnyComponent, UnknownRecord } from '../../common';
import { IS_JEST } from '../../common';
import type { ShadowNodeWrapper } from '../../commonTypes';
import type {
  AnimatedComponentRef,
  IAnimatedComponentInternalBase,
  ViewInfo,
} from '../../createAnimatedComponent/commonTypes';
import type { DefaultStyle } from '../../hook/commonTypes';
import { CSSManager } from '../platform';
import type { CSSStyle } from '../types';
import { filterNonCSSStyleProps } from './utils';

export type AnimatedComponentProps = UnknownRecord & {
  ref?: Ref<Component>;
  style?: StyleProp<DefaultStyle>;
};

// TODO - change these ugly underscore prefixed methods and properties to real
// private/protected ones when possible (when changes from this repo are merged
// to the main one)
export default class AnimatedComponent<
  P extends UnknownRecord = AnimatedComponentProps,
  S extends object = UnknownRecord,
>
  extends Component<P, S>
  implements IAnimatedComponentInternalBase
{
  ChildComponent: AnyComponent;

  _CSSManager?: CSSManager;

  _viewInfo?: ViewInfo;
  _cssStyle: CSSStyle = {}; // RN style object with Reanimated CSS properties
  _componentRef: AnimatedComponentRef | HTMLElement | null = null;
  _componentDOMRef: HTMLElement | null = null;
  _willUnmount: boolean = false;

  constructor(ChildComponent: AnyComponent, props: P) {
    super(props);
    this.ChildComponent = ChildComponent;
  }

  getComponentViewTag() {
    return this._getViewInfo().viewTag as number;
  }

  _onSetLocalRef() {
    // noop - can be overridden in subclasses
  }

  _getViewInfo(): ViewInfo {
    if (this._viewInfo !== undefined) {
      return this._viewInfo;
    }

    const shadowNodeWrapper: ShadowNodeWrapper | null = null;
    const reactViewName: string | undefined = undefined;

    // At this point we assume that `_setComponentRef` was already called and `_componentRef` is set.
    // `this._componentRef` on web represents HTMLElement of our component, that's why we use casting
    // TODO - implement a valid solution later on - this is a temporary fix
    const viewTag = this._componentRef;
    const DOMElement = this._componentDOMRef;

    this._viewInfo = { viewTag, shadowNodeWrapper, reactViewName };
    if (DOMElement) {
      this._viewInfo.DOMElement = DOMElement;
    }

    return this._viewInfo;
  }

  _setComponentRef = (ref: Component | HTMLElement) => {
    const forwardedRef = this.props.forwardedRef as
      | ((ref: Component | HTMLElement) => void)
      | { current: Component | HTMLElement | null }
      | undefined;
    // Forward to user ref prop (if one has been specified)
    if (typeof forwardedRef === 'function') {
      // Handle function-based refs. String-based refs are handled as functions.
      forwardedRef(ref);
    } else if (typeof forwardedRef === 'object' && forwardedRef) {
      // Handle createRef-based refs
      forwardedRef.current = ref;
    }

    if (!ref) {
      // component has been unmounted
      return;
    }
    if (ref !== this._componentRef) {
      this._componentRef = this._resolveComponentRef(ref);
      // if ref is changed, reset viewInfo
      this._viewInfo = undefined;
    }
    this._onSetLocalRef();
  };

  _resolveComponentRef = (ref: Component | HTMLElement | null) => {
    const componentRef = ref as AnimatedComponentRef;
    // Component can specify ref which should be animated when animated version of the component is created.
    // Otherwise, we animate the component itself.
    if (componentRef && componentRef.getAnimatableRef) {
      return componentRef.getAnimatableRef();
    }
    // Case for SVG components on Web
    if (componentRef && componentRef.elementRef) {
      this._componentDOMRef = componentRef.elementRef.current;
    } else {
      this._componentDOMRef = ref as HTMLElement;
    }
    return componentRef;
  };

  _updateStyles(props: P) {
    this._cssStyle = (StyleSheet.flatten(
      props.style as StyleProp<DefaultStyle>
    ) ?? {}) as CSSStyle;
  }

  componentDidMount() {
    this._updateStyles(this.props);

    if (!IS_JEST) {
      this._CSSManager ??= new CSSManager(
        this._getViewInfo(),
        // `react-native-svg`'s web classes don't set `static displayName`
        // (only the native side does), so fall back to the class `name` which
        // matches the React `displayName` pattern used elsewhere.
        this.ChildComponent.displayName ?? this.ChildComponent.name
      );
      this._CSSManager?.update(this._cssStyle);
    }

    this._willUnmount = false;
  }

  componentWillUnmount() {
    if (!IS_JEST && this._CSSManager) {
      this._CSSManager.unmountCleanup();
    }

    this._willUnmount = true;
  }

  shouldComponentUpdate(nextProps: P) {
    this._updateStyles(nextProps);

    if (this._CSSManager) {
      this._CSSManager.update(this._cssStyle);
    }

    // TODO - maybe check if the render is necessary instead of always returning true
    return true;
  }

  render(props?: ComponentProps<AnyComponent>) {
    const { ChildComponent } = this;

    const platformProps = Platform.select({
      web: {},
      default: { collapsable: false },
    });

    return (
      <ChildComponent
        {...(props ?? this.props)}
        {...platformProps}
        style={filterNonCSSStyleProps(
          (props?.style ?? this.props.style) as StyleProp<CSSStyle>
        )}
        // Casting is used here, because ref can be null - in that case it cannot be assigned to HTMLElement.
        // After spending some time trying to figure out what to do with this problem, we decided to leave it this way
        ref={this._setComponentRef as (ref: Component) => void}
      />
    );
  }
}
