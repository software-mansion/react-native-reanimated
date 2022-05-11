import React, { Component, ComponentType, MutableRefObject, Ref } from 'react';
import { findNodeHandle, Platform, StyleSheet } from 'react-native';
import WorkletEventHandler from './reanimated2/WorkletEventHandler';
import setAndForwardRef from './setAndForwardRef';
import './reanimated2/layoutReanimation/LayoutAnimationRepository';
import invariant from 'invariant';
import { adaptViewConfig } from './ConfigHelper';
import { RNRenderer } from './reanimated2/platform-specific/RNRenderer';
import {
  makeMutable,
  runOnUI,
  enableLayoutAnimations,
} from './reanimated2/core';
import {
  DefaultEntering,
  DefaultExiting,
  DefaultLayout,
} from './reanimated2/layoutReanimation/defaultAnimations/Default';
import {
  isJest,
  isChromeDebugger,
  shouldBeUseWeb,
} from './reanimated2/PlatformChecker';
import { initialUpdaterRun } from './reanimated2/animation';
import {
  BaseAnimationBuilder,
  EntryExitAnimationFunction,
  ILayoutAnimationBuilder,
} from './reanimated2/layoutReanimation';
import {
  SharedValue,
  StyleProps,
  ShadowNodeWrapper,
} from './reanimated2/commonTypes';
import {
  ViewDescriptorsSet,
  ViewRefSet,
} from './reanimated2/ViewDescriptorsSet';
import { getShadowNodeWrapperFromRef } from './reanimated2/fabricUtils';

function dummyListener() {
  // empty listener we use to assign to listener properties for which animated
  // event is used.
}

type NestedArray<T> = T | NestedArray<T>[];
function flattenArray<T>(array: NestedArray<T>): T[] {
  if (!Array.isArray(array)) {
    return [array];
  }
  const resultArr: T[] = [];

  const _flattenArray = (arr: NestedArray<T>[]): void => {
    arr.forEach((item) => {
      if (Array.isArray(item)) {
        _flattenArray(item);
      } else {
        resultArr.push(item);
      }
    });
  };
  _flattenArray(array);
  return resultArr;
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

const has = <K extends string>(
  key: K,
  x: unknown
): x is { [key in K]: unknown } => {
  if (typeof x === 'function' || typeof x === 'object') {
    if (x === null || x === undefined) {
      return false;
    } else {
      return key in x;
    }
  }
  return false;
};

interface AnimatedProps extends Record<string, unknown> {
  viewDescriptors?: ViewDescriptorsSet;
  viewsRef?: ViewRefSet<unknown>;
  initial?: SharedValue<StyleProps>;
}

export type AnimatedComponentProps<P extends Record<string, unknown>> = P & {
  forwardedRef?: Ref<Component>;
  style?: NestedArray<StyleProps>;
  animatedProps?: Partial<AnimatedComponentProps<AnimatedProps>>;
  animatedStyle?: StyleProps;
  layout?:
    | BaseAnimationBuilder
    | ILayoutAnimationBuilder
    | typeof BaseAnimationBuilder;
  entering?:
    | BaseAnimationBuilder
    | typeof BaseAnimationBuilder
    | EntryExitAnimationFunction
    | Keyframe;
  exiting?:
    | BaseAnimationBuilder
    | typeof BaseAnimationBuilder
    | EntryExitAnimationFunction
    | Keyframe;
};

type Options<P> = {
  setNativeProps: (ref: ComponentRef, props: P) => void;
};

interface ComponentRef extends Component {
  setNativeProps?: (props: Record<string, unknown>) => void;
  getScrollableNode?: () => ComponentRef;
}

export interface InitialComponentProps extends Record<string, unknown> {
  ref?: Ref<Component>;
  collapsable?: boolean;
}

export default function createAnimatedComponent(
  Component: ComponentType<InitialComponentProps>,
  options?: Options<InitialComponentProps>
): ComponentType<AnimatedComponentProps<InitialComponentProps>> {
  invariant(
    typeof Component !== 'function' ||
      (Component.prototype && Component.prototype.isReactComponent),
    '`createAnimatedComponent` does not support stateless functional components; ' +
      'use a class component instead.'
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
    sv: SharedValue<null | Record<string, unknown>> | null;
    _component: ComponentRef | null = null;
    static displayName: string;

    constructor(props: AnimatedComponentProps<InitialComponentProps>) {
      super(props);
      if (isJest()) {
        this.animatedStyle = { value: {} };
      }
      this.sv = makeMutable({});
    }

    componentWillUnmount() {
      this._detachNativeEvents();
      this._detachStyles();
      this.sv = null;
    }

    componentDidMount() {
      this._attachNativeEvents();
      this._attachAnimatedStyles();
    }

    _attachNativeEvents() {
      const viewTag = findNodeHandle(this);
      for (const key in this.props) {
        const prop = this.props[key];
        if (
          has('current', prop) &&
          prop.current instanceof WorkletEventHandler
        ) {
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
      if (Platform.OS === 'web' && this._styles !== null) {
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
          const shadowNodeWrapper = getShadowNodeWrapperFromRef(this);
          runOnUI(() => {
            'worklet';
            _removeShadowNodeFromRegistry(shadowNodeWrapper);
          })();
        }
      }
    }

    _reattachNativeEvents(
      prevProps: AnimatedComponentProps<InitialComponentProps>
    ) {
      let viewTag: number | undefined;

      for (const key in this.props) {
        const prop = this.props[key];
        if (
          has('current', prop) &&
          prop.current instanceof WorkletEventHandler
        ) {
          if (viewTag === undefined) {
            viewTag = prop.current.viewTag;
          }
        }
      }
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

      for (const key in this.props) {
        const prop = this.props[key];
        if (
          has('current', prop) &&
          prop.current instanceof WorkletEventHandler &&
          prop.current.reattachNeeded
        ) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          prop.current.registerForEvents(viewTag!, key);
          prop.current.reattachNeeded = false;
        }
      }
    }

    _updateFromNative(props: StyleProps) {
      if (options?.setNativeProps) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        options.setNativeProps(this._component!, props);
      } else {
        // eslint-disable-next-line no-unused-expressions
        this._component?.setNativeProps?.(props);
      }
    }

    _attachAnimatedStyles() {
      const styles = this.props.style
        ? onlyAnimatedStyles(flattenArray<StyleProps>(this.props.style))
        : [];
      const prevStyles = this._styles;
      this._styles = styles;

      const prevAnimatedProps = this._animatedProps;
      this._animatedProps = this.props.animatedProps;

      let viewTag: number | null;
      let viewName: string | null;
      let shadowNodeWrapper: ShadowNodeWrapper | null = null;
      if (Platform.OS === 'web') {
        viewTag = findNodeHandle(this);
        viewName = null;
        shadowNodeWrapper = null;
      } else {
        // hostInstance can be null for a component that doesn't render anything (render function returns null). Example: svg Stop: https://github.com/react-native-svg/react-native-svg/blob/develop/src/elements/Stop.tsx
        const hostInstance = RNRenderer.findHostInstance_DEPRECATED(this);
        if (!hostInstance) {
          throw new Error(
            'Cannot find host instance for this component. Maybe it renders nothing?'
          );
        }
        // we can access view tag in the same way it's accessed here https://github.com/facebook/react/blob/e3f4eb7272d4ca0ee49f27577156b57eeb07cf73/packages/react-native-renderer/src/ReactFabric.js#L146
        viewTag = hostInstance?._nativeTag;
        /**
         * RN uses viewConfig for components for storing different properties of the component(example: https://github.com/facebook/react-native/blob/master/Libraries/Components/ScrollView/ScrollViewViewConfig.js#L16).
         * The name we're looking for is in the field named uiViewClassName.
         */
        viewName = hostInstance?.viewConfig?.uiViewClassName;
        // update UI props whitelist for this view
        const hasReanimated2Props =
          this.props.animatedProps?.viewDescriptors || styles.length;
        if (hasReanimated2Props && hostInstance?.viewConfig) {
          adaptViewConfig(hostInstance.viewConfig);
        }

        if (global._IS_FABRIC) {
          shadowNodeWrapper = getShadowNodeWrapperFromRef(this);
        }
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
          tag: viewTag!,
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
    }

    _setComponentRef = setAndForwardRef<Component>({
      getForwardedRef: () =>
        this.props.forwardedRef as MutableRefObject<
          Component<Record<string, unknown>, Record<string, unknown>, unknown>
        >,
      setLocalRef: (ref) => {
        // TODO update config
        const tag = findNodeHandle(ref);
        if (
          (this.props.layout || this.props.entering || this.props.exiting) &&
          tag != null
        ) {
          if (!shouldBeUseWeb()) {
            enableLayoutAnimations(true, false);
          }
          let layout = this.props.layout ? this.props.layout : DefaultLayout;
          let entering = this.props.entering
            ? this.props.entering
            : DefaultEntering;
          let exiting = this.props.exiting
            ? this.props.exiting
            : DefaultExiting;

          if (has('build', layout)) {
            layout = layout.build();
          }

          if (has('build', entering)) {
            entering = entering.build() as EntryExitAnimationFunction;
          }

          if (has('build', exiting)) {
            exiting = exiting.build() as EntryExitAnimationFunction;
          }

          const config = {
            layout,
            entering,
            exiting,
            sv: this.sv,
          };
          runOnUI(() => {
            'worklet';
            global.LayoutAnimationRepository.registerConfig(tag, config);
          })();
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
                  ...initialUpdaterRun<StyleProps>(style.initial.updater),
                };
              }
              return this.initialStyle;
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
        <Component {...props} ref={this._setComponentRef} {...platformProps} />
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
