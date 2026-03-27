'use strict';
import type { ComponentProps, Ref } from 'react';
import { Component } from 'react';
import type { StyleProp } from 'react-native';
import { Platform, StyleSheet } from 'react-native';

import type { AnyComponent, AnyRecord, PlainStyle } from '../../common';
import { IS_JEST, SHOULD_BE_USE_WEB } from '../../common';
import { stylePropsBuilder } from '../../common/style';
import type {
  InternalHostInstance,
  ShadowNodeWrapper,
} from '../../commonTypes';
import type {
  AnimatedComponentRef,
  IAnimatedComponentInternalBase,
  ViewInfo,
} from '../../createAnimatedComponent/commonTypes';
import { getViewInfo } from '../../createAnimatedComponent/getViewInfo';
import { getShadowNodeWrapperFromRef } from '../../fabricUtils';
import { findHostInstance } from '../../platform-specific/findHostInstance';
import { ReanimatedModule } from '../../ReanimatedModule';
import { markNodeAsRemovable, unmarkNodeAsRemovable } from '../native';
import { normalizeCSSTransitionProperties } from '../native/normalization/transition';
import type { CSSTransitionConfig } from '../native/types';
import { CSSManager } from '../platform';
import type { CSSStyle, CSSTransitionProperties } from '../types';
import {
  filterCSSAndStyleProperties,
  type PseudoStylesBySelector,
} from '../utils/props';
import { filterNonCSSStyleProps } from './utils';

export type AnimatedComponentProps = Record<string, unknown> & {
  ref?: Ref<Component>;
  style?: StyleProp<PlainStyle>;
};

const PSEUDO_STATE_KEYS = new Set([
  'default',
  ':hover',
  ':active',
  ':active-deepest',
  ':focus',
  ':focus-within',
]);

// A transition* field at the component level may be a scalar/array (the
// same for all pseudo states) or a pseudo-keyed object such as
// { default: '500ms', ':hover': '200ms' } that overrides per state. This
// resolves to the value that should apply when the given selector is the
// "owner" of the transition being preconfigured. Falls back to `default` if
// the selector key is missing, then leaves the value untouched if it isn't
// a pseudo-keyed object.
function resolveForSelector<T>(
  value: T | undefined,
  selector: string
): T | undefined {
  if (
    value === null ||
    value === undefined ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return value;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  const looksPseudoKeyed = keys.some((k) => PSEUDO_STATE_KEYS.has(k));
  if (!looksPseudoKeyed) {
    return value;
  }
  return (obj[selector] as T | undefined) ?? (obj.default as T | undefined);
}

// TODO - change these ugly underscore prefixed methods and properties to real
// private/protected ones when possible (when changes from this repo are merged
// to the main one)
export default class AnimatedComponent<
  P extends AnyRecord = AnimatedComponentProps,
  S extends AnyRecord = Record<string, unknown>,
>
  extends Component<P, S>
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
  _pseudoStylesRegistered: boolean = false;

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
    let reactViewName: string | undefined;

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
        throw new Error(
          '[Reanimated] Cannot find host instance for this component. Maybe it renders nothing?'
        );
      }

      const viewInfo = getViewInfo(hostInstance);
      viewTag = viewInfo.viewTag ?? -1;
      reactViewName = viewInfo.reactViewName;
      shadowNodeWrapper = getShadowNodeWrapperFromRef(
        this as InternalHostInstance,
        hostInstance
      );
    }
    this._viewInfo = { viewTag, shadowNodeWrapper, reactViewName };
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

  _registerPseudoStyles(
    pseudoStylesBySelector: PseudoStylesBySelector,
    transitionProperties: CSSTransitionProperties | null
  ) {
    const { shadowNodeWrapper, viewTag } = this._getViewInfo();
    if (!shadowNodeWrapper || typeof viewTag !== 'number') {
      return;
    }

    for (const [selector, { selectorStyle, defaultStyle }] of Object.entries(
      pseudoStylesBySelector
    )) {
      const builtSelectorStyle = stylePropsBuilder.build(selectorStyle);
      const builtDefaultStyle = stylePropsBuilder.build(defaultStyle);

      // Resolve each transition* field for this selector first (collapses
      // pseudo-keyed objects like { default, ':hover' } down to a scalar/array
      // for THIS selector), then run the result through the existing
      // normalizeCSSTransitionProperties to honor per-property alignment with
      // transitionProperty.
      const resolvedTransitionProperties: CSSTransitionProperties = {};
      if (transitionProperties) {
        for (const [key, value] of Object.entries(transitionProperties)) {
          (resolvedTransitionProperties as AnyRecord)[key] = resolveForSelector(
            value,
            selector
          );
        }
      }
      const normalized = normalizeCSSTransitionProperties(
        resolvedTransitionProperties
      );

      const transition: CSSTransitionConfig = {};
      const props = new Set([
        ...Object.keys(builtSelectorStyle),
        ...Object.keys(builtDefaultStyle),
      ]);
      for (const prop of props) {
        const settings =
          normalized &&
          (!normalized.specificProperties ||
            normalized.specificProperties.has(prop))
            ? (normalized.settings[prop] ?? normalized.settings.all)
            : null;

        const fromValue = builtDefaultStyle[prop] ?? builtSelectorStyle[prop];
        const toValue = builtSelectorStyle[prop] ?? builtDefaultStyle[prop];
        transition[prop] = {
          value: [fromValue, toValue],
          duration: settings?.duration ?? 0,
          delay: settings?.delay ?? 0,
          timingFunction: settings?.timingFunction ?? 'ease',
          allowDiscrete: settings?.allowDiscrete ?? false,
        };
      }

      ReanimatedModule.registerPseudoStyle(shadowNodeWrapper, {
        selector,
        selectorStyle: builtSelectorStyle,
        defaultStyle: builtDefaultStyle,
        transition,
      });
    }
    this._pseudoStylesRegistered = true;
  }

  _unregisterPseudoStyles() {
    if (!this._pseudoStylesRegistered) {
      return;
    }
    const viewTag = this._viewInfo?.viewTag;
    if (typeof viewTag === 'number') {
      ReanimatedModule.unregisterPseudoStyle(viewTag);
    }
    this._pseudoStylesRegistered = false;
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
      this._CSSManager ??= new CSSManager(
        this._getViewInfo(),
        this.ChildComponent.displayName
      );
      const [, transitionProperties, , pseudoStylesBySelector] =
        filterCSSAndStyleProperties(this._cssStyle);
      this._CSSManager?.update(this._cssStyle);

      if (!SHOULD_BE_USE_WEB && pseudoStylesBySelector) {
        this._registerPseudoStyles(
          pseudoStylesBySelector,
          transitionProperties
        );
      }
    }

    this._willUnmount = false;
  }

  componentWillUnmount() {
    if (!IS_JEST && this._CSSManager) {
      this._CSSManager.unmountCleanup();
    }

    if (!IS_JEST && !SHOULD_BE_USE_WEB) {
      this._unregisterPseudoStyles();
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
