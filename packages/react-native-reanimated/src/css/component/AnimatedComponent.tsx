'use strict';
import React, { Component } from 'react';
import type { MutableRefObject, Ref } from 'react';
import type {
  AnimatedComponentRef,
  ViewInfo,
} from '../../createAnimatedComponent/commonTypes';
import { isFabric, shouldBeUseWeb } from '../../PlatformChecker';
import { CSSManager } from '../managers';
import type { AnyComponent, AnyRecord, PlainStyle } from '../types';
import { Platform, StyleSheet } from 'react-native';
import type { StyleProp } from 'react-native';
import { findHostInstance } from '../../platform-specific/findHostInstance';
import { ReanimatedError } from '../errors';
import { getViewInfo } from '../../createAnimatedComponent/getViewInfo';
import { getShadowNodeWrapperFromRef } from '../../fabricUtils';
import type { ShadowNodeWrapper } from '../../commonTypes';
import setAndForwardRef from '../../createAnimatedComponent/setAndForwardRef';

const SHOULD_BE_USE_WEB = shouldBeUseWeb();

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

  _CSSManager?: CSSManager;

  _viewInfo?: ViewInfo;
  _planStyle: PlainStyle = {};
  _componentRef: AnimatedComponentRef | HTMLElement | null = null;

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

    let viewTag: number | HTMLElement | null;
    let viewName: string | null;
    let shadowNodeWrapper: ShadowNodeWrapper | null = null;
    let viewConfig;

    if (SHOULD_BE_USE_WEB) {
      // At this point we assume that `_setComponentRef` was already called and `_component` is set.
      // `this._component` on web represents HTMLElement of our component, that's why we use casting
      viewTag = this._componentRef as HTMLElement;
      viewName = null;
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
      viewName = viewInfo.viewName;
      viewConfig = viewInfo.viewConfig;
      shadowNodeWrapper = isFabric()
        ? getShadowNodeWrapperFromRef(this, hostInstance)
        : null;
    }
    this._viewInfo = { viewTag, viewName, shadowNodeWrapper, viewConfig };
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
      return componentRef.getAnimatableRef();
    }
    return componentRef;
  };

  _updateStyles(props: P) {
    this._planStyle = StyleSheet.flatten(props.style) ?? {};
  }

  componentDidMount() {
    this._updateStyles(this.props);

    if (isFabric()) {
      this._CSSManager = new CSSManager(this._getViewInfo());
      this._CSSManager?.attach(this._planStyle);
    }
  }

  componentWillUnmount() {
    this._CSSManager?.detach();
  }

  shouldComponentUpdate(nextProps: P) {
    this._updateStyles(nextProps);

    if (this._CSSManager) {
      this._CSSManager.update(this._planStyle);
    }

    // TODO - maybe check if the render is necessary instead of always returning true
    return true;
  }

  render() {
    const { ChildComponent } = this;

    const platformProps = Platform.select({
      web: {},
      default: { collapsable: false },
    });

    return (
      <ChildComponent
        {...this.props}
        {...platformProps}
        // Casting is used here, because ref can be null - in that case it cannot be assigned to HTMLElement.
        // After spending some time trying to figure out what to do with this problem, we decided to leave it this way
        ref={this._setComponentRef as (ref: Component) => void}
      />
    );
  }
}
