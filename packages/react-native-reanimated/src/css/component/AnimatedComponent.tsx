'use strict';
import type { Component } from 'react';

import type { UnknownRecord } from '../../common';
import { IS_JEST } from '../../common';
import type { ShadowNodeWrapper } from '../../commonTypes';
import type {
  AnimatableDOMElement,
  AnimatedComponentRef,
  ViewInfo,
} from '../../createAnimatedComponent/commonTypes';
import type { AnimatedComponentProps } from './AnimatedComponentCommon';
import AnimatedComponentCommon from './AnimatedComponentCommon';

export type { AnimatedComponentProps } from './AnimatedComponentCommon';

// The element classes do not exist off the DOM (SSR, native Jest project).
function isAnimatableDOMElement(value: unknown): value is AnimatableDOMElement {
  return (
    (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) ||
    (typeof SVGElement !== 'undefined' && value instanceof SVGElement)
  );
}

export default class AnimatedComponent<
  P extends UnknownRecord = AnimatedComponentProps,
  S extends object = UnknownRecord,
> extends AnimatedComponentCommon<P, S> {
  _resolveViewInfo(): ViewInfo {
    const shadowNodeWrapper: ShadowNodeWrapper | null = null;
    const reactViewName: string | undefined = undefined;

    // At this point we assume that `_setComponentRef` was already called and `_componentRef` is set.
    // `this._componentRef` on web represents HTMLElement of our component, that's why we use casting
    // TODO - implement a valid solution later on - this is a temporary fix
    const viewTag = this._componentRef;
    const DOMElement = this._componentDOMRef;

    const viewInfo: ViewInfo = { viewTag, shadowNodeWrapper, reactViewName };
    if (DOMElement) {
      viewInfo.DOMElement = DOMElement;
    }

    return viewInfo;
  }

  _resolveComponentRef = (ref: Component | HTMLElement | null) => {
    let componentRef = ref as AnimatedComponentRef | null;
    // Component can specify ref which should be animated when animated version of the component is created.
    // Otherwise, we animate the component itself.
    if (componentRef?.getAnimatableRef) {
      componentRef = componentRef.getAnimatableRef();
    }
    // Case for SVG components on Web
    if (componentRef?.elementRef) {
      this._componentDOMRef = componentRef.elementRef.current;
    } else {
      this._componentDOMRef = isAnimatableDOMElement(componentRef)
        ? componentRef
        : null;
    }
    return componentRef;
  };

  componentDidMount() {
    this._updateStyles(this.props);

    if (!IS_JEST) {
      this._CSSManager ??= this._createCSSManager();
      this._CSSManager?.update(this._cssStyle, this.props);
    }

    this._willUnmount = false;
  }

  componentWillUnmount() {
    if (!IS_JEST && this._CSSManager) {
      this._CSSManager.unmountCleanup();
    }

    this._willUnmount = true;
  }
}
