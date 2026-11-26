'use strict';
import type { Component } from 'react';

import type { UnknownRecord } from '../../common';
import type { InternalHostInstance } from '../../commonTypes';
import type {
  AnimatedComponentRef,
  ViewInfo,
} from '../../createAnimatedComponent/commonTypes';
import { getViewInfo } from '../../createAnimatedComponent/getViewInfo';
import { getShadowNodeWrapperFromRef } from '../../fabricUtils';
import { findHostInstance } from '../../platform-specific/findHostInstance';
import { markNodeAsRemovable, unmarkNodeAsRemovable } from '../native';
import type { AnimatedComponentProps } from './AnimatedComponentCommon';
import AnimatedComponentCommon from './AnimatedComponentCommon';

export type { AnimatedComponentProps } from './AnimatedComponentCommon';

export default class AnimatedComponent<
  P extends UnknownRecord = AnimatedComponentProps,
  S extends object = UnknownRecord,
> extends AnimatedComponentCommon<P, S> {
  _resolveViewInfo(): ViewInfo {
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

    return { viewTag, shadowNodeWrapper, reactViewName };
  }

  _releasePreviousHost(previousViewInfo: ViewInfo) {
    // Let the native registries drop the previous host once it has left
    // the shadow tree, as `componentWillUnmount` does.
    const wrapper = previousViewInfo.shadowNodeWrapper;

    if (wrapper) {
      markNodeAsRemovable(wrapper);
    }
  }

  _resolveComponentRef = (ref: Component | HTMLElement | null) => {
    const componentRef = ref as AnimatedComponentRef;
    // Component can specify ref which should be animated when animated version of the component is created.
    // Otherwise, we animate the component itself.
    if (componentRef && componentRef.getAnimatableRef) {
      return componentRef.getAnimatableRef();
    }
    return componentRef;
  };

  componentDidMount() {
    this._updateStyles(this.props);

    const viewTag = this._viewInfo?.viewTag;
    if (this._willUnmount && typeof viewTag === 'number') {
      unmarkNodeAsRemovable(viewTag);
    }

    this._CSSManager ??= this._createCSSManager();
    this._CSSManager?.update(this._cssStyle, this.props);

    this._willUnmount = false;
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
}
