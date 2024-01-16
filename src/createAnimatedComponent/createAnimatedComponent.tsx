'use strict';
import type {
  Component,
  ComponentClass,
  ComponentType,
  FunctionComponent,
  MutableRefObject,
} from 'react';
import React from 'react';
import { findNodeHandle, Platform } from 'react-native';
import WorkletEventHandler from '../reanimated2/WorkletEventHandler';
import '../reanimated2/layoutReanimation/animationsManager';
import invariant from 'invariant';
import { adaptViewConfig } from '../ConfigHelper';
import { RNRenderer } from '../reanimated2/platform-specific/RNRenderer';
import { enableLayoutAnimations } from '../reanimated2/core';
import {
  SharedTransition,
  LayoutAnimationType,
} from '../reanimated2/layoutReanimation';
import type { StyleProps, ShadowNodeWrapper } from '../reanimated2/commonTypes';
import { getShadowNodeWrapperFromRef } from '../reanimated2/fabricUtils';
import { removeFromPropsRegistry } from '../reanimated2/PropsRegistry';
import { getReduceMotionFromConfig } from '../reanimated2/animation/util';
import { maybeBuild } from '../animationBuilder';
import { SkipEnteringContext } from '../reanimated2/component/LayoutAnimationConfig';
import type { AnimateProps } from '../reanimated2';
import JSPropsUpdater from './JSPropsUpdater';
import type {
  AnimatedComponentProps,
  AnimatedProps,
  InitialComponentProps,
  AnimatedComponentRef,
  IAnimatedComponentInternal,
  ViewInfo,
} from './commonTypes';
import { has, flattenArray } from './utils';
import setAndForwardRef from './setAndForwardRef';
import {
  isFabric,
  isJest,
  isWeb,
  shouldBeUseWeb,
} from '../reanimated2/PlatformChecker';
import { InlinePropManager } from './InlinePropManager';
import { PropsFilter } from './PropsFilter';
import {
  startWebLayoutAnimation,
  tryActivateLayoutTransition,
  configureWebLayoutAnimations,
  getReducedMotionFromConfig,
  saveSnapshot,
} from '../reanimated2/layoutReanimation/web';
import { updateLayoutAnimations } from '../reanimated2/UpdateLayoutAnimations';
import type { CustomConfig } from '../reanimated2/layoutReanimation/web/config';
import type { FlatList, FlatListProps } from 'react-native';
import { addHTMLMutationObserver } from '../reanimated2/layoutReanimation/web/domUtils';

const IS_WEB = isWeb();
const IS_FABRIC = isFabric();

if (IS_WEB) {
  configureWebLayoutAnimations();
}

function onlyAnimatedStyles(styles: StyleProps[]): StyleProps[] {
  return styles.filter((style) => style?.viewDescriptors);
}

function isSameAnimatedStyle(
  style1?: StyleProps,
  style2?: StyleProps
): boolean {
  // We cannot use equality check to compare useAnimatedStyle outputs directly.
  // Instead, we can compare its viewsRefs.
  return style1?.viewsRef === style2?.viewsRef;
}

const isSameAnimatedProps = isSameAnimatedStyle;

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
 * @deprecated Please use `Animated.FlatList` component instead of calling `Animated.createAnimatedComponent(FlatList)` manually.
 */
// @ts-ignore This is required to create this overload, since type of createAnimatedComponent is incorrect and doesn't include typeof FlatList
export function createAnimatedComponent(
  component: typeof FlatList<unknown>,
  options?: Options<any>
): ComponentClass<AnimateProps<FlatListProps<unknown>>>;

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
    _viewTag = -1;
    _isFirstRender = true;
    jestAnimatedStyle: { value: StyleProps } = { value: {} };
    _component: AnimatedComponentRef | HTMLElement | null = null;
    _sharedElementTransition: SharedTransition | null = null;
    _jsPropsUpdater = new JSPropsUpdater();
    _InlinePropManager = new InlinePropManager();
    _PropsFilter = new PropsFilter();
    _viewInfo?: ViewInfo;
    static displayName: string;
    static contextType = SkipEnteringContext;
    context!: React.ContextType<typeof SkipEnteringContext>;

    constructor(props: AnimatedComponentProps<InitialComponentProps>) {
      super(props);
      if (isJest()) {
        this.jestAnimatedStyle = { value: {} };
      }
    }

    componentDidMount() {
      this._attachNativeEvents();
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

        startWebLayoutAnimation(
          this.props,
          this._component as HTMLElement,
          LayoutAnimationType.ENTERING
        );
      }

      this._isFirstRender = false;
    }

    componentWillUnmount() {
      this._detachNativeEvents();
      this._jsPropsUpdater.removeOnJSPropsChangeListener(this);
      this._detachStyles();
      this._InlinePropManager.detachInlineProps();
      this._sharedElementTransition?.unregisterTransition(this._viewTag);

      const exiting = this.props.exiting;
      if (
        IS_WEB &&
        this.props.exiting &&
        !getReducedMotionFromConfig(this.props.exiting as CustomConfig)
      ) {
        addHTMLMutationObserver();

        startWebLayoutAnimation(
          this.props,
          this._component as HTMLElement,
          LayoutAnimationType.EXITING
        );
      } else if (exiting) {
        const reduceMotionInExiting =
          'getReduceMotion' in exiting &&
          typeof exiting.getReduceMotion === 'function'
            ? getReduceMotionFromConfig(exiting.getReduceMotion())
            : getReduceMotionFromConfig();
        if (!reduceMotionInExiting) {
          updateLayoutAnimations(
            this._viewTag,
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

    _getEventViewRef() {
      // Make sure to get the scrollable node for components that implement
      // `ScrollResponder.Mixin`.
      return (this._component as AnimatedComponentRef)?.getScrollableNode
        ? (this._component as AnimatedComponentRef).getScrollableNode?.()
        : this._component;
    }

    _attachNativeEvents() {
      const node = this._getEventViewRef() as AnimatedComponentRef;
      let viewTag = null; // We set it only if needed

      for (const key in this.props) {
        const prop = this.props[key];
        if (
          has('current', prop) &&
          prop.current instanceof WorkletEventHandler
        ) {
          if (viewTag === null) {
            viewTag = findNodeHandle(options?.setNativeProps ? this : node);
          }
          prop.current.registerForEvents(viewTag as number, key);
        }
      }
    }

    _detachNativeEvents() {
      for (const key in this.props) {
        const prop = this.props[key];
        if (
          has('current', prop) &&
          prop.current instanceof WorkletEventHandler
        ) {
          prop.current.unregisterFromEvents();
        }
      }
    }

    _detachStyles() {
      if (IS_WEB && this._styles !== null) {
        for (const style of this._styles) {
          style.viewsRef.remove(this);
        }
      } else if (this._viewTag !== -1 && this._styles !== null) {
        for (const style of this._styles) {
          style.viewDescriptors.remove(this._viewTag);
        }
        if (this.props.animatedProps?.viewDescriptors) {
          this.props.animatedProps.viewDescriptors.remove(this._viewTag);
        }
        if (IS_FABRIC) {
          removeFromPropsRegistry(this._viewTag);
        }
      }
    }

    _reattachNativeEvents(
      prevProps: AnimatedComponentProps<InitialComponentProps>
    ) {
      for (const key in prevProps) {
        const prop = this.props[key];
        if (
          has('current', prop) &&
          prop.current instanceof WorkletEventHandler &&
          prop.current.reattachNeeded
        ) {
          prop.current.unregisterFromEvents();
        }
      }

      let viewTag = null;

      for (const key in this.props) {
        const prop = this.props[key];
        if (
          has('current', prop) &&
          prop.current instanceof WorkletEventHandler &&
          prop.current.reattachNeeded
        ) {
          if (viewTag === null) {
            const node = this._getEventViewRef() as AnimatedComponentRef;
            viewTag = findNodeHandle(options?.setNativeProps ? this : node);
          }
          prop.current.registerForEvents(viewTag as number, key);
          prop.current.reattachNeeded = false;
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

      if (IS_WEB) {
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
          throw new Error(
            '[Reanimated] Cannot find host instance for this component. Maybe it renders nothing?'
          );
        }
        // we can access view tag in the same way it's accessed here https://github.com/facebook/react/blob/e3f4eb7272d4ca0ee49f27577156b57eeb07cf73/packages/react-native-renderer/src/ReactFabric.js#L146
        viewTag = hostInstance?._nativeTag;
        /**
         * RN uses viewConfig for components for storing different properties of the component(example: https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Components/ScrollView/ScrollViewNativeComponent.js#L24).
         * The name we're looking for is in the field named uiViewClassName.
         */
        viewName = hostInstance?.viewConfig?.uiViewClassName;

        viewConfig = hostInstance?.viewConfig;

        if (IS_FABRIC) {
          shadowNodeWrapper = getShadowNodeWrapperFromRef(this);
        }
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

      this._viewTag = viewTag as number;

      // remove old styles
      if (prevStyles) {
        // in most of the cases, views have only a single animated style and it remains unchanged
        const hasOneSameStyle =
          styles.length === 1 &&
          prevStyles.length === 1 &&
          isSameAnimatedStyle(styles[0], prevStyles[0]);

        if (!hasOneSameStyle) {
          // otherwise, remove each style that is not present in new styles
          for (const prevStyle of prevStyles) {
            const isPresent = styles.some((style) =>
              isSameAnimatedStyle(style, prevStyle)
            );
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
        if (isJest()) {
          /**
           * We need to connect Jest's TestObject instance whose contains just props object
           * with the updateProps() function where we update the properties of the component.
           * We can't update props object directly because TestObject contains a copy of props - look at render function:
           * const props = this._filterNonAnimatedProps(this.props);
           */
          this.jestAnimatedStyle.value = {
            ...this.jestAnimatedStyle.value,
            ...style.initial.value,
          };
          style.jestAnimatedStyle.current = this.jestAnimatedStyle;
        }
      });

      // detach old animatedProps
      if (
        prevAnimatedProps &&
        !isSameAnimatedProps(prevAnimatedProps, this.props.animatedProps)
      ) {
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
      this._reattachNativeEvents(prevProps);
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
          this._component as HTMLElement,
          snapshot
        );
      }
    }

    _configureLayoutTransition() {
      const layout = this.props.layout
        ? maybeBuild(
            this.props.layout,
            undefined /* We don't have to warn user if style has common properties with animation for LAYOUT */,
            AnimatedComponent.displayName
          )
        : undefined;
      updateLayoutAnimations(this._viewTag, LayoutAnimationType.LAYOUT, layout);
    }

    _setComponentRef = setAndForwardRef<Component | HTMLElement>({
      getForwardedRef: () =>
        this.props.forwardedRef as MutableRefObject<
          Component<Record<string, unknown>, Record<string, unknown>, unknown>
        >,
      setLocalRef: (ref) => {
        // TODO update config

        const tag = IS_WEB
          ? (ref as HTMLElement)
          : findNodeHandle(ref as Component);

        const { layout, entering, exiting, sharedTransitionTag } = this.props;
        if (
          (layout || entering || exiting || sharedTransitionTag) &&
          tag != null
        ) {
          if (!shouldBeUseWeb()) {
            enableLayoutAnimations(true, false);
          }

          const skipEntering = this.context?.current;
          if (entering && !skipEntering) {
            updateLayoutAnimations(
              tag as number,
              LayoutAnimationType.ENTERING,
              maybeBuild(
                entering,
                this.props?.style,
                AnimatedComponent.displayName
              )
            );
          }
          if (sharedTransitionTag && !IS_WEB) {
            const sharedElementTransition =
              this.props.sharedTransitionStyle ?? new SharedTransition();
            const reduceMotionInTransition = getReduceMotionFromConfig(
              sharedElementTransition.getReduceMotion()
            );
            if (!reduceMotionInTransition) {
              sharedElementTransition.registerTransition(
                tag as number,
                sharedTransitionTag
              );
              this._sharedElementTransition = sharedElementTransition;
            }
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

      if (isJest()) {
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

      return (
        <Component
          {...filteredProps}
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
