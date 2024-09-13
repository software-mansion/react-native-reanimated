'use strict';
import type {
  Component,
  ComponentClass,
  ComponentType,
  FunctionComponent,
  MutableRefObject,
} from 'react';
import React from 'react';
import { Platform } from 'react-native';
import { findNodeHandle } from '../platformFunctions/findNodeHandle';
import '../layoutReanimation/animationsManager';
import invariant from 'invariant';
import { adaptViewConfig } from '../ConfigHelper';
import { RNRenderer } from '../platform-specific/RNRenderer';
import { enableLayoutAnimations } from '../core';
import { SharedTransition, LayoutAnimationType } from '../layoutReanimation';
import type { StyleProps, ShadowNodeWrapper } from '../commonTypes';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import { removeFromPropsRegistry } from '../PropsRegistry';
import { getReduceMotionFromConfig } from '../animation/util';
import { maybeBuild } from '../animationBuilder';
import { SkipEnteringContext } from '../component/LayoutAnimationConfig';
import type { AnimateProps } from '../helperTypes';
import JSPropsUpdater from './JSPropsUpdater';
import type {
  AnimatedComponentProps,
  AnimatedProps,
  InitialComponentProps,
  AnimatedComponentRef,
  IAnimatedComponentInternal,
  ViewInfo,
  INativeEventsManager,
  NestedArray,
} from './commonTypes';
import { flattenArray } from './utils';
import setAndForwardRef from './setAndForwardRef';
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
import type { FlatList, FlatListProps } from 'react-native';
import { addHTMLMutationObserver } from '../layoutReanimation/web/domUtils';
import { getViewInfo } from './getViewInfo';
import { NativeEventsManager } from './NativeEventsManager';
import type { ReanimatedHTMLElement } from '../js-reanimated';
import { ReanimatedError } from '../errors';

const IS_WEB = isWeb();
const IS_JEST = isJest();
const SHOULD_BE_USE_WEB = shouldBeUseWeb();

if (IS_WEB) {
  configureWebLayoutAnimations();
}

function onlyAnimatedStyles(styles: StyleProps[]): StyleProps[] {
  return styles.filter((style) => style?.viewDescriptors);
}

type Options<P> = {
  setNativeProps: (ref: AnimatedComponentRef, props: P) => void;
};

/**
 * Lets you create an Animated version of any React Native component.
 *
 * @param component - The component you want to make animatable.
 * @returns A component that Reanimated is capable of animating.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/createAnimatedComponent
 */

// Don't change the order of overloads, since such a change breaks current behavior
export function createAnimatedComponent<P extends object>(
  component: FunctionComponent<P>,
  options?: Options<P>
): FunctionComponent<AnimateProps<P>>;

export function createAnimatedComponent<P extends object>(
  component: ComponentClass<P>,
  options?: Options<P>
): ComponentClass<AnimateProps<P>>;

export function createAnimatedComponent<P extends object>(
  // Actually ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P> but we need this overload too
  // since some external components (like FastImage) are typed just as ComponentType
  component: ComponentType<P>,
  options?: Options<P>
): FunctionComponent<AnimateProps<P>> | ComponentClass<AnimateProps<P>>;

/**
 * @deprecated Please use `Animated.FlatList` component instead of calling
 *   `Animated.createAnimatedComponent(FlatList)` manually.
 */
// @ts-ignore This is required to create this overload, since type of createAnimatedComponent is incorrect and doesn't include typeof FlatList
export function createAnimatedComponent(
  component: typeof FlatList<unknown>,
  options?: Options<any>
): ComponentClass<AnimateProps<FlatListProps<unknown>>>;

let id = 0;

export function createAnimatedComponent(
  Component: ComponentType<InitialComponentProps>,
  options?: Options<InitialComponentProps>
): any {
  invariant(
    typeof Component !== 'function' ||
      (Component.prototype && Component.prototype.isReactComponent),
    `Looks like you're passing a function component \`${Component.name}\` to \`createAnimatedComponent\` function which supports only class components. Please wrap your function component with \`React.forwardRef()\` or use a class component instead.`
  );

  class AnimatedComponent
    extends React.Component<AnimatedComponentProps<InitialComponentProps>>
    implements IAnimatedComponentInternal
  {
    _styles: StyleProps[] | null = null;
    _animatedProps?: Partial<AnimatedComponentProps<AnimatedProps>>;
    _componentViewTag = -1;
    _isFirstRender = true;
    jestInlineStyle: NestedArray<StyleProps> | undefined;
    jestAnimatedStyle: { value: StyleProps } = { value: {} };
    _component: AnimatedComponentRef | HTMLElement | null = null;
    _sharedElementTransition: SharedTransition | null = null;
    _jsPropsUpdater = new JSPropsUpdater();
    _InlinePropManager = new InlinePropManager();
    _PropsFilter = new PropsFilter();
    _NativeEventsManager?: INativeEventsManager;
    _viewInfo?: ViewInfo;
    static displayName: string;
    static contextType = SkipEnteringContext;
    context!: React.ContextType<typeof SkipEnteringContext>;
    reanimatedID = id++;

    constructor(props: AnimatedComponentProps<InitialComponentProps>) {
      super(props);
      if (IS_JEST) {
        this.jestAnimatedStyle = { value: {} };
      }
      const entering = this.props.entering;
      if (entering && isFabric()) {
        updateLayoutAnimations(
          this.reanimatedID,
          LayoutAnimationType.ENTERING,
          maybeBuild(entering, this.props?.style, AnimatedComponent.displayName)
        );
      }
    }

    componentDidMount() {
      this._componentViewTag = this._getComponentViewTag();
      if (!IS_WEB) {
        // It exists only on native platforms. We initialize it here because the ref to the animated component is available only post-mount
        this._NativeEventsManager = new NativeEventsManager(this, options);
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
          saveSnapshot(this._component as HTMLElement);
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
            this._component as ReanimatedHTMLElement,
            LayoutAnimationType.ENTERING
          );
        } else {
          (this._component as HTMLElement).style.visibility = 'initial';
        }
      }

      this._isFirstRender = false;
    }

    componentWillUnmount() {
      this._NativeEventsManager?.detachEvents();
      this._jsPropsUpdater.removeOnJSPropsChangeListener(this);
      this._detachStyles();
      this._InlinePropManager.detachInlineProps();
      if (this.props.sharedTransitionTag) {
        this._configureSharedTransition(true);
      }
      this._sharedElementTransition?.unregisterTransition(
        this._componentViewTag,
        true
      );

      const exiting = this.props.exiting;

      if (
        IS_WEB &&
        this._component &&
        exiting &&
        !getReducedMotionFromConfig(exiting as CustomConfig)
      ) {
        addHTMLMutationObserver();

        startWebLayoutAnimation(
          this.props,
          this._component as ReanimatedHTMLElement,
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
            this._componentViewTag,
            LayoutAnimationType.EXITING,
            maybeBuild(
              exiting,
              this.props?.style,
              AnimatedComponent.displayName
            )
          );
        }
      }
    }

    _getComponentViewTag() {
      return this._getViewInfo().viewTag as number;
    }

    _detachStyles() {
      if (this._componentViewTag !== -1 && this._styles !== null) {
        for (const style of this._styles) {
          style.viewDescriptors.remove(this._componentViewTag);
        }
        if (this.props.animatedProps?.viewDescriptors) {
          this.props.animatedProps.viewDescriptors.remove(
            this._componentViewTag
          );
        }
        if (isFabric()) {
          removeFromPropsRegistry(this._componentViewTag);
        }
      }
    }

    _updateFromNative(props: StyleProps) {
      if (options?.setNativeProps) {
        options.setNativeProps(this._component as AnimatedComponentRef, props);
      } else {
        (this._component as AnimatedComponentRef)?.setNativeProps?.(props);
      }
    }

    _getViewInfo(): ViewInfo {
      if (this._viewInfo !== undefined) {
        return this._viewInfo;
      }

      let viewTag: number | HTMLElement | null;
      let viewName: string | null;
      let shadowNodeWrapper: ShadowNodeWrapper | null = null;
      let viewConfig;
      // Component can specify ref which should be animated when animated version of the component is created.
      // Otherwise, we animate the component itself.
      const component = (this._component as AnimatedComponentRef)
        ?.getAnimatableRef
        ? (this._component as AnimatedComponentRef).getAnimatableRef?.()
        : this;

      if (SHOULD_BE_USE_WEB) {
        // At this point I assume that `_setComponentRef` was already called and `_component` is set.
        // `this._component` on web represents HTMLElement of our component, that's why we use casting
        viewTag = this._component as HTMLElement;
        viewName = null;
        shadowNodeWrapper = null;
        viewConfig = null;
      } else {
        // hostInstance can be null for a component that doesn't render anything (render function returns null). Example: svg Stop: https://github.com/react-native-svg/react-native-svg/blob/develop/src/elements/Stop.tsx
        const hostInstance = RNRenderer.findHostInstance_DEPRECATED(component);
        if (!hostInstance) {
          throw new ReanimatedError(
            'Cannot find host instance for this component. Maybe it renders nothing?'
          );
        }

        const viewInfo = getViewInfo(hostInstance);
        viewTag = viewInfo.viewTag;
        viewName = viewInfo.viewName;
        viewConfig = viewInfo.viewConfig;
        shadowNodeWrapper = isFabric()
          ? getShadowNodeWrapperFromRef(this)
          : null;
      }
      this._viewInfo = { viewTag, viewName, shadowNodeWrapper, viewConfig };
      return this._viewInfo;
    }

    _attachAnimatedStyles() {
      const styles = this.props.style
        ? onlyAnimatedStyles(flattenArray<StyleProps>(this.props.style))
        : [];
      const prevStyles = this._styles;
      this._styles = styles;

      const prevAnimatedProps = this._animatedProps;
      this._animatedProps = this.props.animatedProps;

      const { viewTag, viewName, shadowNodeWrapper, viewConfig } =
        this._getViewInfo();

      // update UI props whitelist for this view
      const hasReanimated2Props =
        this.props.animatedProps?.viewDescriptors || styles.length;
      if (hasReanimated2Props && viewConfig) {
        adaptViewConfig(viewConfig);
      }

      this._componentViewTag = viewTag as number;

      // remove old styles
      if (prevStyles) {
        // in most of the cases, views have only a single animated style and it remains unchanged
        const hasOneSameStyle =
          styles.length === 1 &&
          prevStyles.length === 1 &&
          styles[0] === prevStyles[0];

        if (!hasOneSameStyle) {
          // otherwise, remove each style that is not present in new styles
          for (const prevStyle of prevStyles) {
            const isPresent = styles.some((style) => style === prevStyle);
            if (!isPresent) {
              prevStyle.viewDescriptors.remove(viewTag);
            }
          }
        }
      }

      styles.forEach((style) => {
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
        saveSnapshot(this._component as HTMLElement);
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
          this._component as ReanimatedHTMLElement,
          snapshot
        );
      }
    }

    _configureLayoutTransition() {
      if (IS_WEB) {
        return;
      }

      const layout = this.props.layout
        ? maybeBuild(
            this.props.layout,
            undefined /* We don't have to warn user if style has common properties with animation for LAYOUT */,
            AnimatedComponent.displayName
          )
        : undefined;
      updateLayoutAnimations(
        this._componentViewTag,
        LayoutAnimationType.LAYOUT,
        layout
      );
    }

    _configureSharedTransition(isUnmounting = false) {
      if (IS_WEB) {
        return;
      }

      const { sharedTransitionTag } = this.props;
      if (!sharedTransitionTag) {
        this._sharedElementTransition?.unregisterTransition(
          this._componentViewTag,
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
        this._componentViewTag,
        sharedTransitionTag,
        isUnmounting
      );
      this._sharedElementTransition = sharedElementTransition;
    }

    _setComponentRef = setAndForwardRef<Component | HTMLElement>({
      getForwardedRef: () =>
        this.props.forwardedRef as MutableRefObject<
          Component<Record<string, unknown>, Record<string, unknown>, unknown>
        >,
      setLocalRef: (ref) => {
        // TODO update config

        const tag = findNodeHandle(ref as Component);

        // callback refs are executed twice - when the component mounts with ref,
        // and with null when it unmounts
        if (tag !== null) {
          this._componentViewTag = tag;
        }

        const { layout, entering, exiting, sharedTransitionTag } = this.props;
        if (
          (layout || entering || exiting || sharedTransitionTag) &&
          tag != null
        ) {
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
                maybeBuild(
                  exiting,
                  this.props?.style,
                  AnimatedComponent.displayName
                )
              );
            }
          }

          const skipEntering = this.context?.current;
          if (entering && !skipEntering && !IS_WEB) {
            updateLayoutAnimations(
              tag,
              LayoutAnimationType.ENTERING,
              maybeBuild(
                entering,
                this.props?.style,
                AnimatedComponent.displayName
              )
            );
          }
        }

        if (ref !== this._component) {
          this._component = ref;
        }
      },
    });

    // This is a component lifecycle method from React, therefore we are not calling it directly.
    // It is called before the component gets rerendered. This way we can access components' position before it changed
    // and later on, in componentDidUpdate, calculate translation for layout transition.
    getSnapshotBeforeUpdate() {
      if (
        IS_WEB &&
        (this._component as HTMLElement)?.getBoundingClientRect !== undefined
      ) {
        return (this._component as HTMLElement).getBoundingClientRect();
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

      return (
        <Component
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

  AnimatedComponent.displayName = `AnimatedComponent(${
    Component.displayName || Component.name || 'Component'
  })`;

  return React.forwardRef<Component>((props, ref) => {
    return (
      <AnimatedComponent
        {...props}
        {...(ref === null ? null : { forwardedRef: ref })}
      />
    );
  });
}
