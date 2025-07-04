'use strict';
import '../layoutReanimation/animationsManager';

import type React from 'react';

import { getReduceMotionFromConfig } from '../animation/util';
import { maybeBuild } from '../animationBuilder';
import { IS_JEST, IS_WEB } from '../common';
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
  _animatedProps?: Partial<AnimatedComponentProps<AnimatedProps>>;
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
    this._attachAnimatedStyles();
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

  _attachAnimatedStyles() {
    const animatedProps = this.props.animatedProps;
    const prevAnimatedProps = this._animatedProps;
    this._animatedProps = animatedProps;

    const { viewTag, shadowNodeWrapper } = this._getViewInfo();

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
    this._attachAnimatedStyles();
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
    const filtered = filterStyles(flattenArray(props.style ?? []));
    this._prevAnimatedStyles = this._animatedStyles;
    this._animatedStyles = filtered.animatedStyles;
    this._cssStyle = filtered.cssStyle;
  }

  _configureLayoutAnimation(
    type: LayoutAnimationType,
    currentConfig: LayoutAnimationOrBuilder | undefined,
    previousConfig?: LayoutAnimationOrBuilder
  ) {
    if (IS_WEB || currentConfig === previousConfig) {
      return;
    }

    if (this._isReducedMotion(currentConfig)) {
      if (!previousConfig) {
        return;
      }
      currentConfig = undefined;
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

  _isReducedMotion(config?: LayoutAnimationOrBuilder): boolean {
    return config &&
      'getReduceMotion' in config &&
      typeof config.getReduceMotion === 'function'
      ? getReduceMotionFromConfig(config.getReduceMotion())
      : getReduceMotionFromConfig();
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
