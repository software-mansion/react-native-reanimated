'use strict';
import '../layoutReanimation/animationsManager';

import type React from 'react';
import { StyleSheet } from 'react-native';

import { checkStyleOverwriting, maybeBuild } from '../animationBuilder';
import { IS_JEST, IS_WEB, logger } from '../common';
import type { StyleProps } from '../commonTypes';
import { LayoutAnimationType } from '../commonTypes';
import { SkipEnteringContext } from '../component/LayoutAnimationConfig';
import ReanimatedAnimatedComponent from '../css/component/AnimatedComponent';
import { getStaticFeatureFlag } from '../featureFlags';
import type { AnimatedStyleHandle } from '../hook/commonTypes';
import { type BaseAnimationBuilder } from '../layoutReanimation';
import { SharedTransition } from '../layoutReanimation/SharedTransition';
import {
  configureWebLayoutAnimations,
  getReducedMotionFromConfig,
  saveSnapshot,
  startWebLayoutAnimation,
  tryActivateLayoutTransition,
} from '../layoutReanimation/web';
import type { CustomConfig } from '../layoutReanimation/web/config';
import { addHTMLMutationObserver } from '../layoutReanimation/web/domUtils';
import { PropsRegistryGarbageCollector } from '../PropsRegistryGarbageCollector';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import { updateLayoutAnimations } from '../UpdateLayoutAnimations';
import type {
  AnimatedComponentProps,
  AnimatedComponentRef,
  AnimatedProps,
  AnyComponent,
  IAnimatedComponentInternal,
  INativeEventsManager,
  InitialComponentProps,
  LayoutAnimationOrBuilder,
  NestedArray,
} from './commonTypes';
import { InlinePropManager } from './InlinePropManager';
import jsPropsUpdater from './JSPropsUpdater';
import { NativeEventsManager } from './NativeEventsManager';
import { PropsFilter } from './PropsFilter';
import { filterStyles, flattenArray } from './utils';

let id = 0;

if (IS_WEB) {
  configureWebLayoutAnimations();
}

const FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS =
  getStaticFeatureFlag('FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS') && !IS_WEB;

export type Options<P> = {
  setNativeProps?: (ref: AnimatedComponentRef, props: P) => void;
  jsProps?: string[];
};

export default class AnimatedComponent
  extends ReanimatedAnimatedComponent<
    AnimatedComponentProps<InitialComponentProps>,
    { settledProps: StyleProps }
  >
  implements IAnimatedComponentInternal
{
  _options?: Options<InitialComponentProps>;
  _displayName: string;
  _animatedStyles: StyleProps[] = [];
  _prevAnimatedStyles: StyleProps[] = [];
  _animatedProps: Partial<AnimatedComponentProps<AnimatedProps>>[] = [];
  _prevAnimatedProps: Partial<AnimatedComponentProps<AnimatedProps>>[] = [];
  _isFirstRender = true;
  jestInlineStyle: NestedArray<StyleProps> | undefined;
  jestAnimatedStyle: { value: StyleProps } = { value: {} };
  jestAnimatedProps: { value: AnimatedProps } = { value: {} };
  _InlinePropManager = new InlinePropManager();
  _PropsFilter = new PropsFilter();
  _NativeEventsManager?: INativeEventsManager;
  _hasWarnedAboutLayoutAnimationStyleOverwriting?: boolean;
  static contextType = SkipEnteringContext;
  context!: React.ContextType<typeof SkipEnteringContext>;
  reanimatedID = id++;
  _sharedTransition?: SharedTransition;
  _sharedTransitionTag?: string;

  constructor(
    ChildComponent: AnyComponent,
    props: AnimatedComponentProps<InitialComponentProps>,
    displayName: string,
    options?: Options<InitialComponentProps>
  ) {
    super(ChildComponent, props);
    this._options = options;
    this._displayName = displayName;

    if (FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS) {
      this.state = { settledProps: {} };
    }

    if (IS_JEST) {
      this.jestAnimatedStyle = { value: {} };
      this.jestAnimatedProps = { value: {} };
    }
    this._configureSharedTransition(true);
    const entering = this.props.entering;
    const skipEntering = this.context?.current;
    if (!skipEntering) {
      this._configureLayoutAnimation(LayoutAnimationType.ENTERING, entering);
    }
  }

  componentDidMount() {
    super.componentDidMount();
    if (!IS_WEB) {
      // It exists only on native platforms. We initialize it here because the ref to the animated component is available only post-mount
      this._NativeEventsManager = new NativeEventsManager(this, this._options);
    }
    this._NativeEventsManager?.attachEvents();
    this._updateAnimatedStylesAndProps();
    this._InlinePropManager.attachInlineProps(this, this._getViewInfo());

    if (FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS) {
      const viewTag = this.getComponentViewTag();
      if (viewTag !== -1) {
        PropsRegistryGarbageCollector.registerView(viewTag, this);
      }
    }

    if (this._options?.jsProps?.length) {
      jsPropsUpdater.registerComponent(this, this._options.jsProps);
    }

    this._configureLayoutAnimation(
      LayoutAnimationType.LAYOUT,
      this.props.layout
    );
    this._configureLayoutAnimation(
      LayoutAnimationType.EXITING,
      this.props.exiting
    );

    if (IS_WEB && this._componentDOMRef) {
      const element = this._componentDOMRef as ReanimatedHTMLElement;
      const dummyClone = element.dummyClone;
      // If the element was cloned (because of the exiting animation), we need to bring it back to the DOM
      while (dummyClone?.firstChild) {
        element.appendChild(dummyClone.firstChild);
      }
      delete element.dummyClone;

      if (this.props.exiting) {
        saveSnapshot(element);
      }

      if (!this.props.entering) {
        this._isFirstRender = false;
        return;
      }

      if (getReducedMotionFromConfig(this.props.entering as CustomConfig)) {
        this._isFirstRender = false;
        (this.props.entering as BaseAnimationBuilder).callbackV?.(true);
        return;
      }

      const skipEntering = this.context?.current;
      if (!skipEntering) {
        startWebLayoutAnimation(
          this.props,
          element,
          LayoutAnimationType.ENTERING
        );
      } else if (element.style) {
        element.style.visibility = 'initial';
      }
    }

    this._isFirstRender = false;
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this._NativeEventsManager?.detachEvents();
    this._detachStyles();
    this._InlinePropManager.detachInlineProps();

    if (FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS) {
      const viewTag = this.getComponentViewTag();
      if (viewTag !== -1) {
        PropsRegistryGarbageCollector.unregisterView(viewTag);
      }
    }

    if (this._options?.jsProps?.length) {
      jsPropsUpdater.unregisterComponent(this);
    }

    const exiting = this.props.exiting;

    if (IS_WEB && this._componentDOMRef && exiting) {
      if (getReducedMotionFromConfig(exiting as CustomConfig)) {
        (exiting as BaseAnimationBuilder).callbackV?.(true);
        return;
      }

      addHTMLMutationObserver();

      startWebLayoutAnimation(
        this.props,
        this._componentDOMRef as ReanimatedHTMLElement,
        LayoutAnimationType.EXITING
      );
    }
  }

  _syncStylePropsBackToReact(props: StyleProps) {
    if (FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS) {
      this.setState({ settledProps: props });
      // TODO(future): revert changes when animated styles are detached
    }
  }

  _detachStyles() {
    const viewTag = this.getComponentViewTag();
    if (viewTag !== -1) {
      for (const style of this._animatedStyles) {
        style.viewDescriptors.remove(viewTag);
      }
      for (const animatedProp of this._animatedProps) {
        animatedProp?.viewDescriptors?.remove(viewTag);
      }
    }
  }

  setNativeProps(props: StyleProps) {
    if (this._options?.setNativeProps) {
      this._options.setNativeProps(
        this._componentRef as AnimatedComponentRef,
        props
      );
    } else {
      (this._componentRef as AnimatedComponentRef)?.setNativeProps?.(props);
    }
  }

  _handleAnimatedStylesUpdate(
    prevStyles: StyleProps[],
    currentStyles: StyleProps[],
    jestAnimatedStyleOrProps: { value: StyleProps }
  ) {
    const { viewTag, shadowNodeWrapper } = this._getViewInfo();
    const newStyles = new Set<StyleProps>(currentStyles);

    const isStyleAttached = (style: StyleProps) =>
      style.viewDescriptors.has(viewTag);

    // remove old styles
    if (prevStyles) {
      // in most of the cases, views have only a single animated style and it remains unchanged
      const hasOneSameStyle =
        currentStyles.length === 1 &&
        prevStyles.length === 1 &&
        currentStyles[0] === prevStyles[0];

      if (hasOneSameStyle && isStyleAttached(prevStyles[0])) {
        return;
      }

      // otherwise, remove each style that is not present in new styles
      for (const prevStyle of prevStyles) {
        const isPresent = currentStyles.some((style) => {
          if (style === prevStyle && isStyleAttached(style)) {
            newStyles.delete(style);
            return true;
          }
          return false;
        });
        if (!isPresent) {
          prevStyle.viewDescriptors.remove(viewTag);
        }
      }
    }

    newStyles.forEach((style) => {
      style.viewDescriptors.add(
        {
          tag: viewTag,
          shadowNodeWrapper,
        },
        style.styleUpdaterContainer
      );
      if (IS_JEST) {
        /**
         * We need to connect Jest's TestObject instance whose contains just
         * props object with the updateProps() function where we update the
         * properties of the component. We can't update props object directly
         * because TestObject contains a copy of props - look at render
         * function: const props = this._filterNonAnimatedProps(this.props);
         */
        Object.assign(jestAnimatedStyleOrProps.value, style.initial.value);
        style.jestAnimatedValues.current = jestAnimatedStyleOrProps;
      }
    });
  }

  _updateAnimatedStylesAndProps() {
    this._handleAnimatedStylesUpdate(
      this._prevAnimatedStyles,
      this._animatedStyles,
      this.jestAnimatedStyle
    );
    this._handleAnimatedStylesUpdate(
      this._prevAnimatedProps,
      this._animatedProps,
      this.jestAnimatedProps
    );
  }

  componentDidUpdate(
    prevProps: AnimatedComponentProps<InitialComponentProps>,
    _prevState: Readonly<unknown>,
    snapshot: DOMRect | null
  ) {
    this._configureLayoutAnimation(
      LayoutAnimationType.LAYOUT,
      this.props.layout,
      prevProps.layout
    );
    this._configureLayoutAnimation(
      LayoutAnimationType.EXITING,
      this.props.exiting,
      prevProps.exiting
    );
    this._configureSharedTransition();

    this._NativeEventsManager?.updateEvents(prevProps);
    this._updateAnimatedStylesAndProps();
    this._InlinePropManager.attachInlineProps(this, this._getViewInfo());

    if (IS_WEB && this.props.exiting && this._componentDOMRef) {
      saveSnapshot(this._componentDOMRef);
    }

    if (IS_WEB && snapshot && this.props.layout) {
      if (getReducedMotionFromConfig(this.props.layout as CustomConfig)) {
        (this.props.layout as BaseAnimationBuilder).callbackV?.(true);

        return;
      }

      tryActivateLayoutTransition(
        this.props,
        this._componentDOMRef as ReanimatedHTMLElement,
        snapshot
      );
    }
  }

  _updateStyles(props: AnimatedComponentProps<InitialComponentProps>): void {
    const filteredStyles = filterStyles(flattenArray(props.style ?? []));
    this._prevAnimatedStyles = this._animatedStyles;
    this._animatedStyles = filteredStyles.animatedStyles;

    const filteredAnimatedProps = filterStyles(
      flattenArray(props.animatedProps ?? [])
    );
    this._prevAnimatedProps = this._animatedProps;
    this._animatedProps = filteredAnimatedProps.animatedStyles;

    if (filteredAnimatedProps.cssStyle) {
      if (__DEV__ && filteredStyles.cssStyle) {
        logger.warn(
          'AnimatedComponent: CSS properties cannot be used in style and animatedProps at the same time. Using properties from the style object.'
        );
        this._cssStyle = filteredStyles.cssStyle;
        return;
      }

      // Add all remaining props to cssStyle object
      // (e.g. SVG components are styled via top level props, not via style object)
      const mergedProps = {
        ...props,
        ...filteredAnimatedProps.cssStyle,
      };
      delete mergedProps.style;
      delete mergedProps.animatedProps;
      this._cssStyle = mergedProps;
    } else {
      this._cssStyle = filteredStyles.cssStyle ?? {};
    }
  }
  _configureLayoutAnimation(
    type: LayoutAnimationType,
    currentConfig: LayoutAnimationOrBuilder | undefined,
    previousConfig?: LayoutAnimationOrBuilder
  ) {
    if (IS_WEB || currentConfig === previousConfig) {
      return;
    }

    if (
      __DEV__ &&
      currentConfig &&
      type !== LayoutAnimationType.LAYOUT &&
      this.props.style &&
      !this._hasWarnedAboutLayoutAnimationStyleOverwriting
    ) {
      const onWarn = () =>
        (this._hasWarnedAboutLayoutAnimationStyleOverwriting = true);
      checkStyleOverwriting(
        currentConfig,
        this.props.style,
        this._displayName,
        onWarn
      );
    }

    updateLayoutAnimations(
      type === LayoutAnimationType.ENTERING
        ? this.reanimatedID
        : this.getComponentViewTag(),
      type,
      currentConfig && maybeBuild(currentConfig)
    );
  }

  _configureSharedTransition(useNativeId?: boolean) {
    if (!getStaticFeatureFlag('ENABLE_SHARED_ELEMENT_TRANSITIONS')) {
      return;
    }
    if (!this.props.sharedTransitionTag) {
      if (this._sharedTransitionTag) {
        updateLayoutAnimations(
          useNativeId ? this.reanimatedID : this.getComponentViewTag(),
          useNativeId
            ? LayoutAnimationType.SHARED_ELEMENT_TRANSITION_NATIVE_ID
            : LayoutAnimationType.SHARED_ELEMENT_TRANSITION,
          undefined,
          undefined,
          undefined
        );
        this._sharedTransitionTag = undefined;
      }
      return;
    }
    this._sharedTransitionTag = this.props.sharedTransitionTag;
    const sharedTransition =
      this.props.sharedTransitionStyle ??
      this._sharedTransition ??
      new SharedTransition();
    if (this._sharedTransition !== sharedTransition) {
      updateLayoutAnimations(
        useNativeId ? this.reanimatedID : this.getComponentViewTag(),
        useNativeId
          ? LayoutAnimationType.SHARED_ELEMENT_TRANSITION_NATIVE_ID
          : LayoutAnimationType.SHARED_ELEMENT_TRANSITION,
        maybeBuild(sharedTransition),
        undefined,
        this.props.sharedTransitionTag
      );
      this._sharedTransition = sharedTransition;
    }
  }

  // This is a component lifecycle method from React, therefore we are not calling it directly.
  // It is called before the component gets rerendered. This way we can access components' position before it changed
  // and later on, in componentDidUpdate, calculate translation for layout transition.
  getSnapshotBeforeUpdate() {
    if (
      IS_WEB &&
      this.props.layout &&
      this._componentDOMRef?.getBoundingClientRect
    ) {
      return this._componentDOMRef.getBoundingClientRect();
    }

    // `getSnapshotBeforeUpdate` has to return value which is not `undefined`.
    return null;
  }

  render() {
    const filteredProps = this._PropsFilter.filterNonAnimatedProps(this);

    if (IS_JEST) {
      filteredProps.jestAnimatedStyle = this.jestAnimatedStyle;
      filteredProps.jestAnimatedProps = this.jestAnimatedProps;
    }

    // Layout animations on web are set inside `componentDidMount` method, which is called after first render.
    // Because of that we can encounter a situation in which component is visible for a short amount of time, and later on animation triggers.
    // I've tested that on various browsers and devices and it did not happen to me. To be sure that it won't happen to someone else,
    // I've decided to hide component at first render. Its visibility is reset in `componentDidMount`.
    if (
      this._isFirstRender &&
      IS_WEB &&
      filteredProps.entering &&
      !getReducedMotionFromConfig(filteredProps.entering as CustomConfig)
    ) {
      filteredProps.style = Array.isArray(filteredProps.style)
        ? filteredProps.style.concat([{ visibility: 'hidden' }])
        : {
            ...(filteredProps.style ?? {}),
            visibility: 'hidden', // Hide component until `componentDidMount` triggers
          };
    }

    const skipEntering = this.context?.current;
    let nativeID, jestProps;

    if (IS_JEST) {
      jestProps = {
        jestInlineStyle:
          this.props.style && filterOutAnimatedStyles(this.props.style),
        jestAnimatedStyle: this.jestAnimatedStyle,
        jestAnimatedProps: this.jestAnimatedProps,
      };
    } else if (!skipEntering && !IS_WEB) {
      nativeID = `${this.reanimatedID}`;
    }

    if (FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS) {
      const flatStyles = StyleSheet.flatten(filteredProps.style as object);
      const mergedStyles = {
        ...flatStyles,
        ...this.state.settledProps,
      };
      return super.render({
        nativeID,
        ...filteredProps,
        ...this.state.settledProps,
        style: mergedStyles,
        ...jestProps,
      });
    }

    return super.render({
      nativeID,
      ...filteredProps,
      ...jestProps,
    });
  }
}

function filterOutAnimatedStyles(
  style: NestedArray<StyleProps | AnimatedStyleHandle | null | undefined>
): NestedArray<StyleProps | null | undefined> {
  if (!style) {
    return style;
  }
  if (!Array.isArray(style)) {
    return style?.viewDescriptors ? {} : style;
  }
  return style
    .filter(
      (styleElement) => !(styleElement && 'viewDescriptors' in styleElement)
    )
    .map((styleElement) => {
      if (Array.isArray(styleElement)) {
        return filterOutAnimatedStyles(styleElement);
      }
      return styleElement;
    });
}
