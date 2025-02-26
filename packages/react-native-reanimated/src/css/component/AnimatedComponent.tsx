'use strict';
import type { ComponentProps, MutableRefObject, Ref } from 'react';
import React, { Component } from 'react';
import type { StyleProp } from 'react-native';
import { Platform, StyleSheet } from 'react-native';

import type { ShadowNodeWrapper } from '../../commonTypes';
import type {
  AnimatedComponentRef,
  ViewInfo,
} from '../../createAnimatedComponent/commonTypes';
import { getViewInfo } from '../../createAnimatedComponent/getViewInfo';
import setAndForwardRef from '../../createAnimatedComponent/setAndForwardRef';
import { getShadowNodeWrapperFromRef } from '../../fabricUtils';
import { findHostInstance } from '../../platform-specific/findHostInstance';
import { shouldBeUseWeb } from '../../PlatformChecker';
import { ReanimatedError } from '../errors';
import type { CSSManagerInterface } from '../managers/CSSManagerInterface';
import CSSManagerNative from '../managers/CSSManagerNative';
import CSSManagerWeb from '../managers/CSSManagerWeb';
import type { AnyComponent, AnyRecord, CSSStyle, PlainStyle } from '../types';
import { filterNonCSSStyleProps } from './utils';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

const PlatformCSSManager = SHOULD_BE_USE_WEB ? CSSManagerWeb : CSSManagerNative;

export type AnimatedComponentProps = Record<string, unknown> & {
  ref?: Ref<Component>;
  style?: StyleProp<PlainStyle>;
};

// TODO - change these ugly underscore prefixed methods and properties to real
// private/protected ones when possible (when changes from this repo are merged
// to the main one)
export default class AnimatedComponent<
  P extends AnyRecord = AnimatedComponentProps,
> extends Component<P> {
  ChildComponent: AnyComponent;

  _CSSManager?: CSSManagerInterface;

  _viewInfo?: ViewInfo;
  _cssStyle: CSSStyle = {}; // RN style object with Reanimated CSS properties
  _componentRef: AnimatedComponentRef | HTMLElement | null = null;
  _hasAnimatedRef = false;
  // Used only on web
  _componentDOMRef: HTMLElement | null = null;

  constructor(ChildComponent: AnyComponent, props: P) {
    super(props);
    this.ChildComponent = ChildComponent;
  }

  getComponentViewTag() {
    return this._getViewInfo().viewTag as number;
  }

  hasAnimatedRef() {
    return this._hasAnimatedRef;
  }

  _onSetLocalRef() {
    // noop - can be overridden in subclasses
  }

  _getViewInfo(): ViewInfo {
    if (this._viewInfo !== undefined) {
      return this._viewInfo;
    }

    let viewTag: number | typeof this._componentRef;
    let shadowNodeWrapper: ShadowNodeWrapper | null = null;
    let viewConfig;
    let DOMElement: HTMLElement | null = null;

    if (SHOULD_BE_USE_WEB) {
      // At this point we assume that `_setComponentRef` was already called and `_component` is set.
      // `this._component` on web represents HTMLElement of our component, that's why we use casting
      // TODO - implement a valid solution later on - this is a temporary fix
      viewTag = this._componentRef;
      DOMElement = this._componentDOMRef;
      shadowNodeWrapper = null;
      viewConfig = null;
    } else {
      const hostInstance = findHostInstance(this);
      if (!hostInstance) {
        /* 
          findHostInstance can return null for a component that doesn't render anything 
          (render function returns null). Example: 
          svg Stop: https://github.com/react-native-svg/react-native-svg/blob/develop/src/elements/Stop.tsx
        */
        throw new ReanimatedError(
          'Cannot find host instance for this component. Maybe it renders nothing?'
        );
      }

      const viewInfo = getViewInfo(hostInstance);
      viewTag = viewInfo.viewTag;
      viewConfig = viewInfo.viewConfig;
      shadowNodeWrapper = getShadowNodeWrapperFromRef(this, hostInstance);
    }
    this._viewInfo = { viewTag, shadowNodeWrapper, viewConfig };
    if (DOMElement) {
      this._viewInfo.DOMElement = DOMElement;
    }

    return this._viewInfo;
  }

  _setComponentRef = setAndForwardRef<Component | HTMLElement>({
    getForwardedRef: () =>
      this.props.forwardedRef as MutableRefObject<
        Component<Record<string, unknown>, Record<string, unknown>, unknown>
      >,
    setLocalRef: (ref) => {
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
    },
  });

  _resolveComponentRef = (ref: Component | HTMLElement | null) => {
    const componentRef = ref as AnimatedComponentRef;
    // Component can specify ref which should be animated when animated version of the component is created.
    // Otherwise, we animate the component itself.
    if (componentRef && componentRef.getAnimatableRef) {
      this._hasAnimatedRef = true;
      return componentRef.getAnimatableRef();
    }
    // Case for SVG components on Web
    if (SHOULD_BE_USE_WEB) {
      if (componentRef && componentRef.elementRef) {
        this._componentDOMRef = componentRef.elementRef.current;
      } else {
        this._componentDOMRef = ref as HTMLElement;
      }
    }
    return componentRef;
  };

  _updateStyles(props: P) {
    this._cssStyle = StyleSheet.flatten(props.style) ?? {};
  }

  componentDidMount() {
    this._updateStyles(this.props);

    this._CSSManager = new PlatformCSSManager(this._getViewInfo());
    this._CSSManager?.attach(this._cssStyle);
  }

  componentWillUnmount() {
    this._CSSManager?.detach();
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
        {...this.props}
        {...props}
        {...platformProps}
        style={filterNonCSSStyleProps(props?.style ?? this.props.style)}
        // Casting is used here, because ref can be null - in that case it cannot be assigned to HTMLElement.
        // After spending some time trying to figure out what to do with this problem, we decided to leave it this way
        ref={this._setComponentRef as (ref: Component) => void}
      />
    );
  }
}
