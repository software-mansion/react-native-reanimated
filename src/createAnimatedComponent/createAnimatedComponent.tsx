import type {
  Component,
  ComponentClass,
  ComponentType,
  FunctionComponent,
  MutableRefObject,
  Ref,
} from 'react';
import React from 'react';
import { findNodeHandle, Platform, StyleSheet } from 'react-native';
import WorkletEventHandler from '../reanimated2/WorkletEventHandler';
import setAndForwardRef from './setAndForwardRef';
import '../reanimated2/layoutReanimation/animationsManager';
import invariant from 'invariant';
import { adaptViewConfig } from '../ConfigHelper';
import { RNRenderer } from '../reanimated2/platform-specific/RNRenderer';
import {
  configureLayoutAnimations,
  enableLayoutAnimations,
  startMapper,
  stopMapper,
} from '../reanimated2/core';
import {
  isJest,
  isChromeDebugger,
  shouldBeUseWeb,
  isWeb,
} from '../reanimated2/PlatformChecker';
import { initialUpdaterRun } from '../reanimated2/animation';
import {
  SharedTransition,
  LayoutAnimationType,
} from '../reanimated2/layoutReanimation';
import type {
  SharedValue,
  StyleProps,
  ShadowNodeWrapper,
} from '../reanimated2/commonTypes';
import type {
  ViewDescriptorsSet,
  ViewRefSet,
} from '../reanimated2/ViewDescriptorsSet';
import { makeViewDescriptorsSet } from '../reanimated2/ViewDescriptorsSet';
import { getShadowNodeWrapperFromRef } from '../reanimated2/fabricUtils';
import updateProps from '../reanimated2/UpdateProps';
import NativeReanimatedModule from '../reanimated2/NativeReanimated';
import { isSharedValue } from '../reanimated2/utils';
import type { AnimateProps } from '../reanimated2/helperTypes';
import { removeFromPropsRegistry } from '../reanimated2/PropsRegistry';
import { JSPropUpdater } from './JSPropUpdater';
import { getReduceMotionFromConfig } from '../reanimated2/animation/util';
import { maybeBuild } from '../animationBuilder';
import type { AnimatedComponentProps, AnimatedProps } from './utils';
import { flattenArray, has } from './utils';

const IS_WEB = isWeb();

function dummyListener() {
  // empty listener we use to assign to listener properties for which animated
  // event is used.
}

function onlyAnimatedStyles(styles: StyleProps[]) {
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

function isInlineStyleTransform(transform: any): boolean {
  if (!transform) {
    return false;
  }
  return transform.some((t: Record<string, any>) => hasInlineStyles(t));
}

function hasInlineStyles(style: StyleProps): boolean {
  if (!style) {
    return false;
  }
  return Object.keys(style).some((key) => {
    const styleValue = style[key];
    return (
      isSharedValue(styleValue) ||
      (key === 'transform' && isInlineStyleTransform(styleValue))
    );
  });
}

function extractSharedValuesMapFromProps(
  props: AnimatedComponentProps<InitialComponentProps>
): Record<string, any> {
  const inlineProps: Record<string, any> = {};

  for (const key in props) {
    const value = props[key];
    if (key === 'style') {
      const styles = flattenArray<StyleProps>(props.style ?? []);
      styles.forEach((style) => {
        if (!style) {
          return;
        }
        for (const [key, styleValue] of Object.entries(style)) {
          if (isSharedValue(styleValue)) {
            inlineProps[key] = styleValue;
          } else if (
            key === 'transform' &&
            isInlineStyleTransform(styleValue)
          ) {
            inlineProps[key] = styleValue;
          }
        }
      });
    } else if (isSharedValue(value)) {
      inlineProps[key] = value;
    }
  }

  return inlineProps;
}

function inlinePropsHasChanged(styles1: StyleProps, styles2: StyleProps) {
  if (Object.keys(styles1).length !== Object.keys(styles2).length) {
    return true;
  }

  for (const key of Object.keys(styles1)) {
    if (styles1[key] !== styles2[key]) return true;
  }

  return false;
}

function getInlinePropsUpdate(inlineProps: Record<string, any>) {
  'worklet';
  const update: Record<string, any> = {};
  for (const [key, styleValue] of Object.entries(inlineProps)) {
    if (key === 'transform') {
      update[key] = styleValue.map((transform: Record<string, any>) => {
        return getInlinePropsUpdate(transform);
      });
    } else if (isSharedValue(styleValue)) {
      update[key] = styleValue.value;
    } else {
      update[key] = styleValue;
    }
  }
  return update;
}

type Options<P> = {
  setNativeProps: (ref: ComponentRef, props: P) => void;
};

interface ComponentRef extends Component {
  setNativeProps?: (props: Record<string, unknown>) => void;
  getScrollableNode?: () => ComponentRef;
  getAnimatableRef?: () => ComponentRef;
}

interface InitialComponentProps extends Record<string, unknown> {
  ref?: Ref<Component>;
  collapsable?: boolean;
}

export default function createAnimatedComponent<P extends object>(
  component: FunctionComponent<P>,
  options?: Options<P>
): FunctionComponent<AnimateProps<P>>;

export default function createAnimatedComponent<P extends object>(
  component: ComponentClass<P>,
  options?: Options<P>
): ComponentClass<AnimateProps<P>>;

export default function createAnimatedComponent(
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
    initialStyle = {};
    _component: ComponentRef | HTMLElement | null = null;
    _inlinePropsViewDescriptors: ViewDescriptorsSet | null = null;
    _inlinePropsMapperId: number | null = null;
    _inlineProps: StyleProps = {};
    _sharedElementTransition: SharedTransition | null = null;
    _JSPropUpdater = new JSPropUpdater();
    static displayName: string;

    constructor(props: AnimatedComponentProps<InitialComponentProps>) {
      super(props);
      if (isJest()) {
        this.animatedStyle = { value: {} };
      }
    }

    componentWillUnmount() {
      this._detachNativeEvents();
      this._JSPropUpdater.removeOnJSPropsChangeListener(this);
      this._detachStyles();
      this._detachInlineProps();
      this._sharedElementTransition?.unregisterTransition(this._viewTag);
    }

    componentDidMount() {
      this._attachNativeEvents();
      this._JSPropUpdater.addOnJSPropsChangeListener(this);
      this._attachAnimatedStyles();
      this._attachInlineProps();
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

    _attachInlineProps() {
      const newInlineProps: Record<string, any> =
        extractSharedValuesMapFromProps(this.props);
      const hasChanged = inlinePropsHasChanged(
        newInlineProps,
        this._inlineProps
      );

      if (hasChanged) {
        if (!this._inlinePropsViewDescriptors) {
          this._inlinePropsViewDescriptors = makeViewDescriptorsSet();

          const { viewTag, viewName, shadowNodeWrapper, viewConfig } =
            this._getViewInfo();

          if (Object.keys(newInlineProps).length && viewConfig) {
            adaptViewConfig(viewConfig);
          }

          this._inlinePropsViewDescriptors.add({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            tag: viewTag as number,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            name: viewName!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            shadowNodeWrapper: shadowNodeWrapper!,
          });
        }
        const sharableViewDescriptors =
          this._inlinePropsViewDescriptors.sharableViewDescriptors;

        const maybeViewRef = NativeReanimatedModule.native
          ? undefined
          : ({ items: new Set([this]) } as ViewRefSet<any>); // see makeViewsRefSet

        const updaterFunction = () => {
          'worklet';
          const update = getInlinePropsUpdate(newInlineProps);
          updateProps(sharableViewDescriptors, update, maybeViewRef);
        };
        this._inlineProps = newInlineProps;
        if (this._inlinePropsMapperId) {
          stopMapper(this._inlinePropsMapperId);
        }
        this._inlinePropsMapperId = null;
        if (Object.keys(newInlineProps).length) {
          this._inlinePropsMapperId = startMapper(
            updaterFunction,
            Object.values(newInlineProps)
          );
        }
      }
    }

    _detachInlineProps() {
      if (this._inlinePropsMapperId) {
        stopMapper(this._inlinePropsMapperId);
      }
    }

    componentDidUpdate(
      prevProps: AnimatedComponentProps<InitialComponentProps>
    ) {
      this._reattachNativeEvents(prevProps);
      this._attachAnimatedStyles();
      this._attachInlineProps();
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

    _filterNonAnimatedProps(
      inputProps: AnimatedComponentProps<InitialComponentProps>
    ): Record<string, unknown> {
      const props: Record<string, unknown> = {};
      for (const key in inputProps) {
        const value = inputProps[key];
        if (key === 'style') {
          const styleProp = inputProps.style;
          const styles = flattenArray<StyleProps>(styleProp ?? []);
          const processedStyle: StyleProps = styles.map((style) => {
            if (style && style.viewDescriptors) {
              // this is how we recognize styles returned by useAnimatedStyle
              style.viewsRef.add(this);
              if (this._isFirstRender) {
                this.initialStyle = {
                  ...style.initial.value,
                  ...this.initialStyle,
                  ...initialUpdaterRun<StyleProps>(style.initial.updater),
                };
              }
              return this.initialStyle;
            } else if (hasInlineStyles(style)) {
              if (this._isFirstRender) {
                return getInlinePropsUpdate(style);
              }
              const newStyle: StyleProps = {};
              for (const [key, styleValue] of Object.entries(style)) {
                if (
                  !isSharedValue(styleValue) &&
                  !(key === 'transform' && isInlineStyleTransform(styleValue))
                ) {
                  newStyle[key] = styleValue;
                }
              }
              return newStyle;
            } else {
              return style;
            }
          });
          props[key] = StyleSheet.flatten(processedStyle);
        } else if (key === 'animatedProps') {
          const animatedProp = inputProps.animatedProps as Partial<
            AnimatedComponentProps<AnimatedProps>
          >;
          if (animatedProp.initial !== undefined) {
            Object.keys(animatedProp.initial.value).forEach((key) => {
              props[key] = animatedProp.initial?.value[key];
              animatedProp.viewsRef?.add(this);
            });
          }
        } else if (
          has('current', value) &&
          value.current instanceof WorkletEventHandler
        ) {
          if (value.current.eventNames.length > 0) {
            value.current.eventNames.forEach((eventName) => {
              props[eventName] = has('listeners', value.current)
                ? (value.current.listeners as Record<string, unknown>)[
                    eventName
                  ]
                : dummyListener;
            });
          } else {
            props[key] = dummyListener;
          }
        } else if (isSharedValue(value)) {
          if (this._isFirstRender) {
            props[key] = (value as SharedValue<any>).value;
          }
        } else if (
          key !== 'onGestureHandlerStateChange' ||
          !isChromeDebugger()
        ) {
          props[key] = value;
        }
      }
      return props;
    }

    render() {
      const props = this._filterNonAnimatedProps(this.props);
      if (isJest()) {
        props.animatedStyle = this.animatedStyle;
      }

      if (this._isFirstRender) {
        this._isFirstRender = false;
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
