'use strict';
import '../layoutReanimation/animationsManager';

import type React from 'react';

import { getReduceMotionFromConfig } from '../animation/util';
import { maybeBuild } from '../animationBuilder';
import type { StyleProps } from '../commonTypes';
import { LayoutAnimationType } from '../commonTypes';
import { SkipEnteringContext } from '../component/LayoutAnimationConfig';
import { adaptViewConfig } from '../ConfigHelper';
import { enableLayoutAnimations } from '../core';
import ReanimatedAnimatedComponent from '../css/component/AnimatedComponent';
import type { AnimatedStyleHandle } from '../hook/commonTypes';
import {
  configureWebLayoutAnimations,
  getReducedMotionFromConfig,
  saveSnapshot,
  startWebLayoutAnimation,
  tryActivateLayoutTransition,
} from '../layoutReanimation/web';
import type { CustomConfig } from '../layoutReanimation/web/config';
import { addHTMLMutationObserver } from '../layoutReanimation/web/domUtils';
import { isJest, isWeb, shouldBeUseWeb } from '../PlatformChecker';
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
  NestedArray,
} from './commonTypes';
import { InlinePropManager } from './InlinePropManager';
import JSPropsUpdater from './JSPropsUpdater';
import { NativeEventsManager } from './NativeEventsManager';
import { PropsFilter } from './PropsFilter';
import { filterStyles, flattenArray } from './utils';

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
  jestAnimatedProps: { value: AnimatedProps } = { value: {} };
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
      this.jestAnimatedProps = { value: {} };
    }

    const entering = this.props.entering;
    const skipEntering = this.context?.current;
    if (
      !entering ||
      getReducedMotionFromConfig(entering as CustomConfig) ||
      skipEntering
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
      if (this.props.exiting && this._componentDOMRef) {
        saveSnapshot(this._componentDOMRef);
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
          this._componentDOMRef as ReanimatedHTMLElement,
          LayoutAnimationType.ENTERING
        );
      } else if (this._componentDOMRef) {
        this._componentDOMRef.style.visibility = 'initial';
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

    const exiting = this.props.exiting;

    if (
      IS_WEB &&
      this._componentDOMRef &&
      exiting &&
      !getReducedMotionFromConfig(exiting as CustomConfig)
    ) {
      addHTMLMutationObserver();

      startWebLayoutAnimation(
        this.props,
        this._componentDOMRef as ReanimatedHTMLElement,
        LayoutAnimationType.EXITING
      );
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
    const animatedProps = this.props.animatedProps;
    const prevAnimatedProps = this._animatedProps;
    this._animatedProps = animatedProps;

    const { viewTag, shadowNodeWrapper, viewConfig } = this._getViewInfo();

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

    if (animatedProps && IS_JEST) {
      this.jestAnimatedProps.value = {
        ...this.jestAnimatedProps.value,
        ...animatedProps?.initial?.value,
      };

      if (animatedProps?.jestAnimatedValues) {
        animatedProps.jestAnimatedValues.current = this.jestAnimatedProps;
      }
    }

    this._animatedStyles.forEach((style) => {
      style.viewDescriptors.add({
        tag: viewTag,
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
        style.jestAnimatedValues.current = this.jestAnimatedStyle;
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
    this._NativeEventsManager?.updateEvents(prevProps);
    this._attachAnimatedStyles();
    this._InlinePropManager.attachInlineProps(this, this._getViewInfo());

    if (IS_WEB && this.props.exiting && this._componentDOMRef) {
      saveSnapshot(this._componentDOMRef);
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
        this._componentDOMRef as ReanimatedHTMLElement,
        snapshot
      );
    }
  }

  _updateStyles(props: AnimatedComponentProps<InitialComponentProps>): void {
    const filtered = filterStyles(flattenArray(props.style ?? []));
    this._prevAnimatedStyles = this._animatedStyles;
    this._animatedStyles = filtered.animatedStyles;
    this._cssStyle = filtered.cssStyle;
  }

  _configureLayoutTransition() {
    if (IS_WEB) {
      return;
    }

    const layout = this.props.layout;
    if (layout && getReducedMotionFromConfig(layout as CustomConfig)) {
      return;
    }
    updateLayoutAnimations(
      this.getComponentViewTag(),
      LayoutAnimationType.LAYOUT,
      layout &&
        maybeBuild(
          layout,
          undefined /* We don't have to warn user if style has common properties with animation for LAYOUT */,
          this._displayName
        )
    );
  }

  _onSetLocalRef() {
    const tag = this.getComponentViewTag();

    const { layout, entering, exiting } = this.props;
    if (layout || entering || exiting) {
      if (!SHOULD_BE_USE_WEB) {
        enableLayoutAnimations(true, false);
      }

      if (exiting) {
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
    }
  }

  // This is a component lifecycle method from React, therefore we are not calling it directly.
  // It is called before the component gets rerendered. This way we can access components' position before it changed
  // and later on, in componentDidUpdate, calculate translation for layout transition.
  getSnapshotBeforeUpdate() {
    if (IS_WEB && this._componentDOMRef?.getBoundingClientRect !== undefined) {
      return this._componentDOMRef.getBoundingClientRect();
    }

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
    const nativeID = skipEntering ? undefined : `${this.reanimatedID}`;

    const jestProps = IS_JEST
      ? {
          jestInlineStyle:
            this.props.style && filterOutAnimatedStyles(this.props.style),
          jestAnimatedStyle: this.jestAnimatedStyle,
          jestAnimatedProps: this.jestAnimatedProps,
        }
      : {};

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
