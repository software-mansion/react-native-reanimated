'use strict';
import type { ComponentProps, Ref } from 'react';
import { Component } from 'react';
import type { StyleProp } from 'react-native';
import { Platform, StyleSheet } from 'react-native';

import type { AnyComponent, UnknownRecord } from '../../common';
import type { InternalHostInstance } from '../../commonTypes';
import type {
  AnimatedComponentRef,
  IAnimatedComponentInternalBase,
  ViewInfo,
} from '../../createAnimatedComponent/commonTypes';
import { getViewInfo } from '../../createAnimatedComponent/getViewInfo';
import { getShadowNodeWrapperFromRef } from '../../fabricUtils';
import type { DefaultStyle } from '../../hook/commonTypes';
import { findHostInstance } from '../../platform-specific/findHostInstance';
import { assignRef } from '../../reactUtils';
import {
  getAnimationsStartingStyle,
  markNodeAsRemovable,
  unmarkNodeAsRemovable,
} from '../native';
import { CSSManager } from '../platform';
import type { CSSStyle } from '../types';
import { filterCSSAndStyleProperties } from '../utils';
import { filterCSSProps } from './utils';

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
  _hasMounted: boolean = false;
  _startingStyle: CSSStyle | null = null;
  _forwardedRefCleanup?: () => void;

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

    const hostInstance = findHostInstance(this);
    if (!hostInstance) {
      /*
        findHostInstance can return null for a component that doesn't render anything
        (render function returns null). Example:
        svg Stop: https://github.com/react-native-svg/react-native-svg/blob/develop/src/elements/Stop.tsx
      */
      throw new Error(
        '[Reanimated] Cannot find host instance for this component. Maybe it renders nothing?'
      );
    }

    const viewInfo = getViewInfo(hostInstance);
    const viewTag = viewInfo.viewTag ?? -1;
    const reactViewName = viewInfo.reactViewName;
    const shadowNodeWrapper = getShadowNodeWrapperFromRef(
      this as InternalHostInstance,
      hostInstance
    );

    this._viewInfo = { viewTag, shadowNodeWrapper, reactViewName };

    return this._viewInfo;
  }

  _setComponentRef = (ref: Component | HTMLElement) => {
    // Forward to user ref prop (if one has been specified)
    const forwardedRef = this.props.forwardedRef as Ref<
      Component | HTMLElement
    >;

    if (!ref) {
      // component has been unmounted
      if (this._forwardedRefCleanup) {
        this._forwardedRefCleanup();
        this._forwardedRefCleanup = undefined;
      } else {
        assignRef(forwardedRef, null);
      }
      return;
    }

    this._forwardedRefCleanup = assignRef(forwardedRef, ref);
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
    return componentRef;
  };

  _updateStyles(props: P) {
    this._cssStyle = (StyleSheet.flatten(
      props.style as StyleProp<DefaultStyle>
    ) ?? {}) as CSSStyle;
  }

  componentDidMount() {
    this._updateStyles(this.props);

    const viewTag = this._viewInfo?.viewTag;
    if (this._willUnmount && typeof viewTag === 'number') {
      unmarkNodeAsRemovable(viewTag);
    }

    this._CSSManager ??= new CSSManager(
      this._getViewInfo(),
      // `react-native-svg`'s web classes don't set `static displayName`
      // (only the native side does), so fall back to the class `name` which
      // matches the React `displayName` pattern used elsewhere.
      this.ChildComponent.displayName ?? this.ChildComponent.name
    );
    this._CSSManager?.update(this._cssStyle, this.props);

    this._hasMounted = true;
    this._willUnmount = false;

    if (this._startingStyle) {
      this._startingStyle = null;
      // React keeps the props it mounted the view with and commits them again
      // whenever an ancestor renders, so the starting style has to leave them
      // now that the animations are registered; otherwise a finished
      // animation without a forwards fill would snap back to its first
      // keyframe on the next React commit.
      this.forceUpdate();
    }
  }

  componentWillUnmount() {
    if (this._CSSManager) {
      this._CSSManager.unmountCleanup();
    }

    const wrapper = this._viewInfo?.shadowNodeWrapper;
    if (wrapper) {
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
      this._CSSManager.update(this._cssStyle, nextProps);
    }

    // TODO - maybe check if the render is necessary instead of always returning true
    return true;
  }

  /**
   * Animations are registered natively only after React has committed the
   * mounted view, so the first frame the view could show is its own style.
   * Mounting it with the style the animations start from closes that gap; once
   * mounted, the native side owns these values.
   */
  _getStartingStyle(style: StyleProp<DefaultStyle>): CSSStyle | null {
    if (this._hasMounted) {
      return null;
    }
    const [animationProperties] = filterCSSAndStyleProperties(
      (StyleSheet.flatten(style) ?? {}) as CSSStyle
    );
    if (!animationProperties) {
      return null;
    }
    try {
      return getAnimationsStartingStyle(animationProperties) as CSSStyle | null;
    } catch {
      // An invalid config is reported by the CSS manager once the view mounts.
      return null;
    }
  }

  render(props?: ComponentProps<AnyComponent>) {
    const { ChildComponent } = this;

    const platformProps = Platform.select({
      web: {},
      default: { collapsable: false },
    });

    const renderProps = filterCSSProps(props ?? this.props);
    this._startingStyle = this._getStartingStyle(
      (props ?? this.props).style as StyleProp<DefaultStyle>
    );
    if (this._startingStyle) {
      (renderProps as { style?: StyleProp<CSSStyle> }).style = [
        (renderProps as { style?: StyleProp<CSSStyle> }).style,
        this._startingStyle,
      ];
    }

    return (
      <ChildComponent
        {...renderProps}
        {...platformProps}
        // Casting is used here, because ref can be null - in that case it cannot be assigned to HTMLElement.
        // After spending some time trying to figure out what to do with this problem, we decided to leave it this way
        ref={this._setComponentRef as (ref: Component) => void}
      />
    );
  }
}
