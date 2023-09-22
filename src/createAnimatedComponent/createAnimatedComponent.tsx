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
import {
  configureLayoutAnimations,
  enableLayoutAnimations,
} from '../reanimated2/core';
import {
  SharedTransition,
  LayoutAnimationType,
} from '../reanimated2/layoutReanimation';
import type { StyleProps, ShadowNodeWrapper } from '../reanimated2/commonTypes';
import { getShadowNodeWrapperFromRef } from '../reanimated2/fabricUtils';
import { removeFromPropsRegistry } from '../reanimated2/PropsRegistry';
import { getReduceMotionFromConfig } from '../reanimated2/animation/util';
import { maybeBuild } from '../animationBuilder';
import type { AnimateProps } from '../reanimated2';
import { JSPropUpdater } from './JSPropUpdater';
import type {
  AnimatedComponentProps,
  AnimatedProps,
  InitialComponentProps,
} from './utils';
import { has, flattenArray } from './utils';
import setAndForwardRef from './setAndForwardRef';
import { isJest, isWeb, shouldBeUseWeb } from '../reanimated2/PlatformChecker';
import { InlinePropManager } from './InlinePropManager';
import { PropsFilter } from './PropsFilter';

const IS_WEB = isWeb();

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
  setNativeProps: (ref: ComponentRef, props: P) => void;
};

interface ComponentRef extends Component {
  setNativeProps?: (props: Record<string, unknown>) => void;
  getScrollableNode?: () => ComponentRef;
  getAnimatableRef?: () => ComponentRef;
}

export function createAnimatedComponent<P extends object>(
  component: FunctionComponent<P>,
  options?: Options<P>
): FunctionComponent<AnimateProps<P>>;

export function createAnimatedComponent<P extends object>(
  component: ComponentClass<P>,
  options?: Options<P>
): ComponentClass<AnimateProps<P>>;

export function createAnimatedComponent(
  Component: ComponentType<InitialComponentProps>,
  options?: Options<InitialComponentProps>
): any {
  invariant(
    typeof Component !== 'function' ||
      (Component.prototype && Component.prototype.isReactComponent),
    `Looks like you're passing a function component \`${Component.name}\` to \`createAnimatedComponent\` function which supports only class components. Please wrap your function component with \`React.forwardRef()\` or use a class component instead.`
  );

  class AnimatedComponent extends React.Component<
    AnimatedComponentProps<InitialComponentProps>
  > {
    _styles: StyleProps[] | null = null;
    _animatedProps?: Partial<AnimatedComponentProps<AnimatedProps>>;
    _viewTag = -1;
    _isFirstRender = true;
    animatedStyle: { value: StyleProps } = { value: {} };
    _component: ComponentRef | HTMLElement | null = null;
    _sharedElementTransition: SharedTransition | null = null;
    _JSPropUpdater = new JSPropUpdater();
    _InlinePropManager = new InlinePropManager();
    _PropsFilter = new PropsFilter();
    static displayName: string;

    constructor(props: AnimatedComponentProps<InitialComponentProps>) {
      super(props);
      if (isJest()) {
        this.animatedStyle = { value: {} };
      }
    }

    componentDidMount() {
      this._attachNativeEvents();
      this._JSPropUpdater.addOnJSPropsChangeListener(this);
      this._attachAnimatedStyles();
      this._InlinePropManager.attachInlineProps(this, this._getViewInfo());
    }

    componentWillUnmount() {
      this._detachNativeEvents();
      this._JSPropUpdater.removeOnJSPropsChangeListener(this);
      this._detachStyles();
      this._InlinePropManager.detachInlineProps();
      this._sharedElementTransition?.unregisterTransition(this._viewTag);
    }

    _getEventViewRef() {
      // Make sure to get the scrollable node for components that implement
      // `ScrollResponder.Mixin`.
      return (this._component as ComponentRef)?.getScrollableNode
        ? (this._component as ComponentRef).getScrollableNode?.()
        : this._component;
    }

    _attachNativeEvents() {
      const node = this._getEventViewRef() as ComponentRef;
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
          if (style?.viewsRef) {
            style.viewsRef.remove(this);
          }
        }
      } else if (this._viewTag !== -1 && this._styles !== null) {
        for (const style of this._styles) {
          style.viewDescriptors.remove(this._viewTag);
        }
        if (this.props.animatedProps?.viewDescriptors) {
          this.props.animatedProps.viewDescriptors.remove(this._viewTag);
        }
        if (global._IS_FABRIC) {
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
            const node = this._getEventViewRef() as ComponentRef;
            viewTag = findNodeHandle(options?.setNativeProps ? this : node);
          }
          prop.current.registerForEvents(viewTag as number, key);
          prop.current.reattachNeeded = false;
        }
      }
    }

    _updateFromNative(props: StyleProps) {
      if (options?.setNativeProps) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        options.setNativeProps(this._component as ComponentRef, props);
      } else {
        // eslint-disable-next-line no-unused-expressions
        (this._component as ComponentRef)?.setNativeProps?.(props);
      }
    }

    _getViewInfo() {
      let viewTag: number | HTMLElement | null;
      let viewName: string | null;
      let shadowNodeWrapper: ShadowNodeWrapper | null = null;
      let viewConfig;
      // Component can specify ref which should be animated when animated version of the component is created.
      // Otherwise, we animate the component itself.
      const component = (this._component as ComponentRef)?.getAnimatableRef
        ? (this._component as ComponentRef).getAnimatableRef?.()
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
         * RN uses viewConfig for components for storing different properties of the component(example: https://github.com/facebook/react-native/blob/master/packages/react-native/Libraries/Components/ScrollView/ScrollViewViewConfig.js#L16).
         * The name we're looking for is in the field named uiViewClassName.
         */
        viewName = hostInstance?.viewConfig?.uiViewClassName;

        viewConfig = hostInstance?.viewConfig;

        if (global._IS_FABRIC) {
          shadowNodeWrapper = getShadowNodeWrapperFromRef(this);
        }
      }
      return { viewTag, viewName, shadowNodeWrapper, viewConfig };
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
          this.animatedStyle.value = {
            ...this.animatedStyle.value,
            ...style.initial.value,
          };
          style.animatedStyle.current = this.animatedStyle;
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
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          tag: viewTag as number,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          name: viewName!,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          shadowNodeWrapper: shadowNodeWrapper!,
        });
      }
    }

    componentDidUpdate(
      prevProps: AnimatedComponentProps<InitialComponentProps>
    ) {
      this._reattachNativeEvents(prevProps);
      this._attachAnimatedStyles();
      this._InlinePropManager.attachInlineProps(this, this._getViewInfo());
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
          if (layout) {
            configureLayoutAnimations(
              tag,
              LayoutAnimationType.LAYOUT,
              maybeBuild(
                layout,
                undefined /* We don't have to warn user if style has common properties with animation for LAYOUT */,
                AnimatedComponent.displayName
              )
            );
          }
          if (entering) {
            configureLayoutAnimations(
              tag,
              LayoutAnimationType.ENTERING,
              maybeBuild(
                entering,
                this.props?.style,
                AnimatedComponent.displayName
              )
            );
          }
          if (exiting) {
            const reduceMotionInExiting =
              'getReduceMotion' in exiting &&
              typeof exiting.getReduceMotion === 'function'
                ? getReduceMotionFromConfig(exiting.getReduceMotion())
                : getReduceMotionFromConfig();
            if (!reduceMotionInExiting) {
              configureLayoutAnimations(
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

    render() {
      const props = this._PropsFilter.filterNonAnimatedProps(this.props);
      this._PropsFilter.onRender();

      if (isJest()) {
        props.animatedStyle = this.animatedStyle;
      }

      const platformProps = Platform.select({
        web: {},
        default: { collapsable: false },
      });

      return (
        <Component
          {...props}
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
