'use strict';
import React from 'react';
import type { Component } from 'react';
import '../layoutReanimation/animationsManager';
import { adaptViewConfig } from '../ConfigHelper';
import { enableLayoutAnimations } from '../core';
import { SharedTransition } from '../layoutReanimation';
import { LayoutAnimationType } from '../commonTypes';
import type { StyleProps } from '../commonTypes';
import { removeFromPropsRegistry } from '../AnimatedPropsRegistry';
import { getReduceMotionFromConfig } from '../animation/util';
import { maybeBuild } from '../animationBuilder';
import { SkipEnteringContext } from '../component/LayoutAnimationConfig';
import JSPropsUpdater from './JSPropsUpdater';
import type {
  AnimatedComponentProps,
  AnimatedProps,
  InitialComponentProps,
  AnimatedComponentRef,
  IAnimatedComponentInternal,
  INativeEventsManager,
  NestedArray,
  AnyComponent,
} from './commonTypes';
import { filterStyles, flattenArray } from './utils';
import { isFabric, isJest, isWeb, shouldBeUseWeb } from '../PlatformChecker';
import { InlinePropManager } from './InlinePropManager';
import { PropsFilter } from './PropsFilter';
import {
  startWebLayoutAnimation,
  tryActivateLayoutTransition,
  configureWebLayoutAnimations,
  getReducedMotionFromConfig,
  saveSnapshot,
} from '../layoutReanimation/web';
import { updateLayoutAnimations } from '../UpdateLayoutAnimations';
import type { CustomConfig } from '../layoutReanimation/web/config';
import { addHTMLMutationObserver } from '../layoutReanimation/web/domUtils';
import { NativeEventsManager } from './NativeEventsManager';
import type { ReanimatedHTMLElement } from '../js-reanimated';
import ReanimatedAnimatedComponent from '../css/component/AnimatedComponent';
import { Platform } from 'react-native';

let id = 0;

const IS_WEB = isWeb();
const IS_JEST = isJest();
const SHOULD_BE_USE_WEB = shouldBeUseWeb();

if (IS_WEB) {
  configureWebLayoutAnimations();
}

export type Options<P> = {
  setNativeProps: (ref: AnimatedComponentRef, props: P) => void;
};

export default class AnimatedComponent
  extends ReanimatedAnimatedComponent<
    AnimatedComponentProps<InitialComponentProps>
  >
  implements IAnimatedComponentInternal
{
  _options?: Options<InitialComponentProps>;
  _displayName: string;
  _animatedStyles: StyleProps[] = [];
  _prevAnimatedStyles: StyleProps[] = [];
  _animatedProps?: Partial<AnimatedComponentProps<AnimatedProps>>;
  _isFirstRender = true;
  jestInlineStyle: NestedArray<StyleProps> | undefined;
  jestAnimatedStyle: { value: StyleProps } = { value: {} };
  _sharedElementTransition: SharedTransition | null = null;
  _jsPropsUpdater = new JSPropsUpdater();
  _InlinePropManager = new InlinePropManager();
  _PropsFilter = new PropsFilter();
  _NativeEventsManager?: INativeEventsManager;
  static contextType = SkipEnteringContext;
  context!: React.ContextType<typeof SkipEnteringContext>;
  reanimatedID = id++;

  constructor(
    ChildComponent: AnyComponent,
    props: AnimatedComponentProps<InitialComponentProps>,
    displayName: string,
    options?: Options<InitialComponentProps>
  ) {
    super(ChildComponent, props);
    this._options = options;
    this._displayName = displayName;

    if (IS_JEST) {
      this.jestAnimatedStyle = { value: {} };
    }

    const entering = this.props.entering;
    const skipEntering = this.context?.current;
    if (
      !entering ||
      getReducedMotionFromConfig(entering as CustomConfig) ||
      skipEntering ||
      !isFabric()
    ) {
      return;
    }
    // This call is responsible for configuring entering animations on Fabric.
    updateLayoutAnimations(
      this.reanimatedID,
      LayoutAnimationType.ENTERING,
      maybeBuild(entering, this.props?.style, displayName)
    );
  }

  componentDidMount() {
    super.componentDidMount();
    if (!IS_WEB) {
      // It exists only on native platforms. We initialize it here because the ref to the animated component is available only post-mount
      this._NativeEventsManager = new NativeEventsManager(this, this._options);
    }
    this._NativeEventsManager?.attachEvents();
    this._jsPropsUpdater.addOnJSPropsChangeListener(this);
    this._attachAnimatedStyles();
    this._InlinePropManager.attachInlineProps(this, this._getViewInfo());

    const layout = this.props.layout;
    if (layout) {
      this._configureLayoutTransition();
    }

    if (IS_WEB) {
      if (this.props.exiting) {
        saveSnapshot(this._componentRef as HTMLElement);
      }

      if (
        !this.props.entering ||
        getReducedMotionFromConfig(this.props.entering as CustomConfig)
      ) {
        this._isFirstRender = false;
        return;
      }

      const skipEntering = this.context?.current;

      if (!skipEntering) {
        startWebLayoutAnimation(
          this.props,
          this._componentRef as ReanimatedHTMLElement,
          LayoutAnimationType.ENTERING
        );
      } else {
        (this._componentRef as HTMLElement).style.visibility = 'initial';
      }
    }

    this._isFirstRender = false;
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this._NativeEventsManager?.detachEvents();
    this._jsPropsUpdater.removeOnJSPropsChangeListener(this);
    this._detachStyles();
    this._InlinePropManager.detachInlineProps();
    if (this.props.sharedTransitionTag) {
      this._configureSharedTransition(true);
    }
    this._sharedElementTransition?.unregisterTransition(
      this.getComponentViewTag(),
      true
    );

    const exiting = this.props.exiting;

    if (
      IS_WEB &&
      this._componentRef &&
      exiting &&
      !getReducedMotionFromConfig(exiting as CustomConfig)
    ) {
      addHTMLMutationObserver();

      startWebLayoutAnimation(
        this.props,
        this._componentRef as ReanimatedHTMLElement,
        LayoutAnimationType.EXITING
      );
    } else if (exiting && !IS_WEB && !isFabric()) {
      const reduceMotionInExiting =
        'getReduceMotion' in exiting &&
        typeof exiting.getReduceMotion === 'function'
          ? getReduceMotionFromConfig(exiting.getReduceMotion())
          : getReduceMotionFromConfig();
      if (!reduceMotionInExiting) {
        updateLayoutAnimations(
          this.getComponentViewTag(),
          LayoutAnimationType.EXITING,
          maybeBuild(exiting, this.props?.style, this._displayName)
        );
      }
    }
  }

  _detachStyles() {
    const viewTag = this.getComponentViewTag();
    if (viewTag !== -1) {
      for (const style of this._animatedStyles) {
        style.viewDescriptors.remove(viewTag);
      }
      if (this.props.animatedProps?.viewDescriptors) {
        this.props.animatedProps.viewDescriptors.remove(viewTag);
      }
      if (isFabric()) {
        removeFromPropsRegistry(viewTag);
      }
    }
  }

  _updateFromNative(props: StyleProps) {
    if (this._options?.setNativeProps) {
      this._options.setNativeProps(
        this._componentRef as AnimatedComponentRef,
        props
      );
    } else {
      (this._componentRef as AnimatedComponentRef)?.setNativeProps?.(props);
    }
  }

  _attachAnimatedStyles() {
    const prevAnimatedProps = this._animatedProps;
    this._animatedProps = this.props.animatedProps;

    const { viewTag, viewName, shadowNodeWrapper, viewConfig } =
      this._getViewInfo();

    // update UI props whitelist for this view
    const hasReanimated2Props =
      this.props.animatedProps?.viewDescriptors || this._animatedStyles?.length;
    if (hasReanimated2Props && viewConfig) {
      adaptViewConfig(viewConfig);
    }

    // remove old styles
    if (this._prevAnimatedStyles) {
      // in most of the cases, views have only a single animated style and it remains unchanged
      const hasOneSameStyle =
        this._animatedStyles.length === 1 &&
        this._prevAnimatedStyles.length === 1 &&
        this._animatedStyles[0] === this._prevAnimatedStyles[0];

      if (!hasOneSameStyle) {
        // otherwise, remove each style that is not present in new styles
        for (const prevStyle of this._prevAnimatedStyles) {
          const isPresent = this._animatedStyles.some(
            (style) => style === prevStyle
          );
          if (!isPresent) {
            prevStyle.viewDescriptors.remove(viewTag);
          }
        }
      }
    }

    this._animatedStyles.forEach((style) => {
      style.viewDescriptors.add({
        tag: viewTag,
        name: viewName,
        shadowNodeWrapper,
      });
      if (IS_JEST) {
        /**
         * We need to connect Jest's TestObject instance whose contains just
         * props object with the updateProps() function where we update the
         * properties of the component. We can't update props object directly
         * because TestObject contains a copy of props - look at render
         * function: const props = this._filterNonAnimatedProps(this.props);
         */
        this.jestAnimatedStyle.value = {
          ...this.jestAnimatedStyle.value,
          ...style.initial.value,
        };
        style.jestAnimatedStyle.current = this.jestAnimatedStyle;
      }
    });

    // detach old animatedProps
    if (prevAnimatedProps && prevAnimatedProps !== this.props.animatedProps) {
      prevAnimatedProps.viewDescriptors!.remove(viewTag as number);
    }

    // attach animatedProps property
    if (this.props.animatedProps?.viewDescriptors) {
      this.props.animatedProps.viewDescriptors.add({
        tag: viewTag as number,
        name: viewName!,
        shadowNodeWrapper: shadowNodeWrapper!,
      });
    }
  }

  componentDidUpdate(
    prevProps: AnimatedComponentProps<InitialComponentProps>,
    _prevState: Readonly<unknown>,
    // This type comes straight from React
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    snapshot: DOMRect | null
  ) {
    const layout = this.props.layout;
    const oldLayout = prevProps.layout;
    if (layout !== oldLayout) {
      this._configureLayoutTransition();
    }
    if (
      this.props.sharedTransitionTag !== undefined ||
      prevProps.sharedTransitionTag !== undefined
    ) {
      this._configureSharedTransition();
    }
    this._NativeEventsManager?.updateEvents(prevProps);
    this._attachAnimatedStyles();
    this._InlinePropManager.attachInlineProps(this, this._getViewInfo());

    if (IS_WEB && this.props.exiting) {
      saveSnapshot(this._componentRef as HTMLElement);
    }

    // Snapshot won't be undefined because it comes from getSnapshotBeforeUpdate method
    if (
      IS_WEB &&
      snapshot !== null &&
      this.props.layout &&
      !getReducedMotionFromConfig(this.props.layout as CustomConfig)
    ) {
      tryActivateLayoutTransition(
        this.props,
        this._componentRef as ReanimatedHTMLElement,
        snapshot
      );
    }
  }

  _updateStyles(props: AnimatedComponentProps<InitialComponentProps>): void {
    const filtered = filterStyles(flattenArray(props.style ?? []));
    this._prevAnimatedStyles = this._animatedStyles;
    this._animatedStyles = filtered.animatedStyles;
    this._planStyle = filtered.plainStyle;
  }

  _configureLayoutTransition() {
    if (IS_WEB) {
      return;
    }

    const layout = this.props.layout;
    if (!layout || getReducedMotionFromConfig(layout as CustomConfig)) {
      return;
    }
    updateLayoutAnimations(
      this.getComponentViewTag(),
      LayoutAnimationType.LAYOUT,
      maybeBuild(
        layout,
        undefined /* We don't have to warn user if style has common properties with animation for LAYOUT */,
        this._displayName
      )
    );
  }

  _configureSharedTransition(isUnmounting = false) {
    if (IS_WEB) {
      return;
    }

    const { sharedTransitionTag } = this.props;
    if (!sharedTransitionTag) {
      this._sharedElementTransition?.unregisterTransition(
        this.getComponentViewTag(),
        isUnmounting
      );
      this._sharedElementTransition = null;
      return;
    }
    const sharedElementTransition =
      this.props.sharedTransitionStyle ??
      this._sharedElementTransition ??
      new SharedTransition();
    sharedElementTransition.registerTransition(
      this.getComponentViewTag(),
      sharedTransitionTag,
      isUnmounting
    );
    this._sharedElementTransition = sharedElementTransition;
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

  _onSetLocalRef() {
    const tag = this.getComponentViewTag();

    const { layout, entering, exiting, sharedTransitionTag } = this.props;
    if (layout || entering || exiting || sharedTransitionTag) {
      if (!SHOULD_BE_USE_WEB) {
        enableLayoutAnimations(true, false);
      }

      if (sharedTransitionTag) {
        this._configureSharedTransition();
      }
      if (exiting && isFabric()) {
        const reduceMotionInExiting =
          'getReduceMotion' in exiting &&
          typeof exiting.getReduceMotion === 'function'
            ? getReduceMotionFromConfig(exiting.getReduceMotion())
            : getReduceMotionFromConfig();
        if (!reduceMotionInExiting) {
          updateLayoutAnimations(
            tag,
            LayoutAnimationType.EXITING,
            maybeBuild(exiting, this.props?.style, this._displayName)
          );
        }
      }

      const skipEntering = this.context?.current;
      if (entering && !isFabric() && !skipEntering && !IS_WEB) {
        updateLayoutAnimations(
          tag,
          LayoutAnimationType.ENTERING,
          maybeBuild(entering, this.props?.style, this._displayName)
        );
      }
    }
  }

  // This is a component lifecycle method from React, therefore we are not calling it directly.
  // It is called before the component gets rerendered. This way we can access components' position before it changed
  // and later on, in componentDidUpdate, calculate translation for layout transition.
  getSnapshotBeforeUpdate() {
    if (
      IS_WEB &&
      (this._componentRef as HTMLElement)?.getBoundingClientRect !== undefined
    ) {
      return (this._componentRef as HTMLElement).getBoundingClientRect();
    }

    return null;
  }

  render() {
    const filteredProps = this._PropsFilter.filterNonAnimatedProps(this);

    if (IS_JEST) {
      filteredProps.jestAnimatedStyle = this.jestAnimatedStyle;
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
      filteredProps.style = {
        ...(filteredProps.style ?? {}),
        visibility: 'hidden', // Hide component until `componentDidMount` triggers
      };
    }

    const platformProps = Platform.select({
      web: {},
      default: { collapsable: false },
    });

    const skipEntering = this.context?.current;
    const nativeID =
      skipEntering || !isFabric() ? undefined : `${this.reanimatedID}`;

    const jestProps = IS_JEST
      ? {
          jestInlineStyle: this.props.style,
          jestAnimatedStyle: this.jestAnimatedStyle,
        }
      : {};

    const ChildComponent = this.ChildComponent;

    return (
      <ChildComponent
        nativeID={nativeID}
        {...filteredProps}
        {...jestProps}
        // Casting is used here, because ref can be null - in that case it cannot be assigned to HTMLElement.
        // After spending some time trying to figure out what to do with this problem, we decided to leave it this way
        ref={this._setComponentRef as (ref: Component) => void}
        {...platformProps}
      />
    );
  }
}
