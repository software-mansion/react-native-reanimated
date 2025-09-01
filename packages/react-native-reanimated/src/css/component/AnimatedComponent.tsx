'use strict';
import type { ComponentProps, Ref } from 'react';
import { Component } from 'react';
import type { StyleProp } from 'react-native';
import { Platform, StyleSheet } from 'react-native';

import { IS_JEST, ReanimatedError, SHOULD_BE_USE_WEB } from '../../common';
import type { ShadowNodeWrapper, WrapperRef } from '../../commonTypes';
import type {
  AnimatedComponentRef,
  IAnimatedComponentInternalBase,
  ViewInfo,
} from '../../createAnimatedComponent/commonTypes';
import { getViewInfo } from '../../createAnimatedComponent/getViewInfo';
import { getShadowNodeWrapperFromRef } from '../../fabricUtils';
import { findHostInstance } from '../../platform-specific/findHostInstance';
import { markNodeAsRemovable, unmarkNodeAsRemovable } from '../native';
import { CSSManager } from '../platform';
import type { AnyComponent, AnyRecord, CSSStyle, PlainStyle } from '../types';
import { filterNonCSSStyleProps } from './utils';

export type AnimatedComponentProps = Record<string, unknown> & {
  ref?: Ref<Component>;
  style?: StyleProp<PlainStyle>;
};

// TODO - change these ugly underscore prefixed methods and properties to real
// private/protected ones when possible (when changes from this repo are merged
// to the main one)
export default class AnimatedComponent<
    P extends AnyRecord = AnimatedComponentProps,
  >
  extends Component<P>
  implements IAnimatedComponentInternalBase
{
  ChildComponent: AnyComponent;

  _CSSManager?: CSSManager;

  _viewInfo?: ViewInfo;
  _cssStyle: CSSStyle = {}; // RN style object with Reanimated CSS properties
  _componentRef: AnimatedComponentRef | HTMLElement | null = null;
  _hasAnimatedRef = false;
  // Used only on web
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

    let viewTag: number | typeof this._componentRef;
    let shadowNodeWrapper: ShadowNodeWrapper | null = null;
    let DOMElement: HTMLElement | null = null;
    let viewName: string | undefined;

    if (SHOULD_BE_USE_WEB) {
      // At this point we assume that `_setComponentRef` was already called and `_component` is set.
      // `this._component` on web represents HTMLElement of our component, that's why we use casting
      // TODO - implement a valid solution later on - this is a temporary fix
      viewTag = this._componentRef;
      DOMElement = this._componentDOMRef;
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
      viewTag = viewInfo.viewTag ?? -1;
      viewName = viewInfo.viewName;
      shadowNodeWrapper = getShadowNodeWrapperFromRef(
        this as WrapperRef,
        hostInstance
      );
    }
    this._viewInfo = { viewTag, shadowNodeWrapper, viewName };
    if (DOMElement) {
      this._viewInfo.DOMElement = DOMElement;
    }

    return this._viewInfo;
  }

  _setComponentRef = (ref: Component | HTMLElement) => {
    const forwardedRef = this.props.forwardedRef;
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

    const viewTag = this._viewInfo?.viewTag;
    if (
      !SHOULD_BE_USE_WEB &&
      this._willUnmount &&
      typeof viewTag === 'number'
    ) {
      unmarkNodeAsRemovable(viewTag);
    }

    if (!IS_JEST) {
      this._CSSManager ??= new CSSManager(this._getViewInfo());
      this._CSSManager?.update(this._cssStyle);
    }

    this._willUnmount = false;
  }

  componentWillUnmount() {
    if (!IS_JEST && this._CSSManager) {
      this._CSSManager.unmountCleanup();
    }

    const wrapper = this._viewInfo?.shadowNodeWrapper;
    if (!SHOULD_BE_USE_WEB && wrapper) {
      // Mark node as removable on the native (C++) side, but only actually remove it
      // when it no longer exists in the Shadow Tree. This ensures proper cleanup of
      // animations/transitions/props while handling cases where the node might be
      // remounted (e.g., when frozen) after componentWillUnmount is called.

      markNodeAsRemovable(wrapper);
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
        style={filterNonCSSStyleProps(props?.style ?? this.props.style)}
        // Casting is used here, because ref can be null - in that case it cannot be assigned to HTMLElement.
        // After spending some time trying to figure out what to do with this problem, we decided to leave it this way
        ref={this._setComponentRef as (ref: Component) => void}
      />
    );
  }
}
