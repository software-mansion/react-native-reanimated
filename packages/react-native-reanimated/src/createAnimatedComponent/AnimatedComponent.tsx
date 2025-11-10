'use strict';
import '../layoutReanimation/animationsManager';

import type React from 'react';

import { maybeBuild } from '../animationBuilder';
import { IS_JEST, IS_WEB, logger } from '../common';
import type { StyleProps } from '../commonTypes';
import { LayoutAnimationType } from '../commonTypes';
import { SkipEnteringContext } from '../component/LayoutAnimationConfig';
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

export type Options<P> = {
  setNativeProps?: (ref: AnimatedComponentRef, props: P) => void;
  jsProps?: string[];
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
  _animatedProps: Partial<AnimatedComponentProps<AnimatedProps>>[] = [];
  _prevAnimatedProps: Partial<AnimatedComponentProps<AnimatedProps>>[] = [];
  _isFirstRender = true;
  jestInlineStyle: NestedArray<StyleProps> | undefined;
  jestAnimatedStyle: { value: StyleProps } = { value: {} };
  jestAnimatedProps: { value: AnimatedProps } = { value: {} };
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

    const skipEntering = this.context?.current;
    if (!skipEntering) {
      this._configureLayoutAnimation(
        LayoutAnimationType.ENTERING,
        this.props.entering
      );
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
      // If the element was cloned (because of the exiting animation), we need bring it
      // back to the DOM
      while (dummyClone?.firstChild) {
        element.appendChild(dummyClone.firstChild);
      }
      delete element.dummyClone;

      if (this.props.exiting) {
        saveSnapshot(element);
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

    if (this._options?.jsProps?.length) {
      jsPropsUpdater.unregisterComponent(this);
    }

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

    this._NativeEventsManager?.updateEvents(prevProps);
    this._updateAnimatedStylesAndProps();
    this._InlinePropManager.attachInlineProps(this, this._getViewInfo());

    if (IS_WEB && this.props.exiting && this._componentDOMRef) {
      saveSnapshot(this._componentDOMRef);
    }

    if (
      IS_WEB &&
      snapshot &&
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

    updateLayoutAnimations(
      type === LayoutAnimationType.ENTERING
        ? this.reanimatedID
        : this.getComponentViewTag(),
      type,
      currentConfig &&
        maybeBuild(
          currentConfig,
          type === LayoutAnimationType.LAYOUT
            ? undefined /* We don't have to warn user if style has common properties with animation for LAYOUT */
            : this.props?.style,
          this._displayName
        )
    );
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
