import React from 'react';
import { findNodeHandle, Platform, StyleSheet } from 'react-native';
import ReanimatedEventEmitter from './ReanimatedEventEmitter';

import WorkletEventHandler from './reanimated2/WorkletEventHandler';
import setAndForwardRef from './setAndForwardRef';
import './reanimated2/layoutReanimation/LayoutAnimationRepository';

import invariant from 'invariant';
import { adaptViewConfig } from './ConfigHelper';
import { RNRenderer } from './reanimated2/platform-specific/RNRenderer';
import { makeMutable, makeRemote, runOnUI } from './reanimated2/core';
import {
  DefaultEntering,
  DefaultExiting,
  DefaultLayout,
} from './reanimated2/layoutReanimation/defaultAnimations/Default';
import { isJest, isChromeDebugger } from './reanimated2/PlatformChecker';

const NODE_MAPPING = new Map();

function listener(data) {
  const component = NODE_MAPPING.get(data.viewTag);
  component && component._updateFromNative(data.props);
}

function dummyListener() {
  // empty listener we use to assign to listener properties for which animated
  // event is used.
}

function flattenArray(array) {
  if (!Array.isArray(array)) {
    return [array];
  }
  const resultArr = [];

  const _flattenArray = (arr) => {
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

export default function createAnimatedComponent(Component, options = {}) {
  invariant(
    typeof Component !== 'function' ||
      (Component.prototype && Component.prototype.isReactComponent),
    '`createAnimatedComponent` does not support stateless functional components; ' +
      'use a class component instead.'
  );

  class AnimatedComponent extends React.Component {
    _invokeAnimatedPropsCallbackOnMount = false;
    _styles = null;
    _viewTag = -1;

    constructor(props) {
      super(props);
      if (isJest()) {
        this.animatedStyle = { value: {} };
      }
      this.sv = makeMutable({});
    }

    componentWillUnmount() {
      this._detachPropUpdater();
      this._propsAnimated && this._propsAnimated.__detach();
      this._detachNativeEvents();
      this._detachStyles();
      this.sv = null;
    }

    componentDidMount() {
      if (this._invokeAnimatedPropsCallbackOnMount) {
        this._invokeAnimatedPropsCallbackOnMount = false;
        this._animatedPropsCallback();
      }

      this._propsAnimated && this._propsAnimated.setNativeView(this._component);
      this._attachNativeEvents();
      this._attachPropUpdater();
      this._attachAnimatedStyles();
    }

    _getEventViewRef() {
      // Make sure to get the scrollable node for components that implement
      // `ScrollResponder.Mixin`.
      return this._component.getScrollableNode
        ? this._component.getScrollableNode()
        : this._component;
    }

    _attachNativeEvents() {
      const node = this._getEventViewRef();
      const viewTag = findNodeHandle(options.setNativeProps ? this : node);
      for (const key in this.props) {
        const prop = this.props[key];
        if (
          prop?.current &&
          prop.current instanceof WorkletEventHandler
        ) {
          console.log("registers ", viewTag, key);
          prop.current.registerForEvents(viewTag, key);
        }
      }
    }

    _detachNativeEvents() {
      for (const key in this.props) {
        const prop = this.props[key];
        if (
          prop?.current &&
          prop.current instanceof WorkletEventHandler
        ) {
          prop.current.unregisterFromEvents();
        }
      }
    }

    _detachStyles() {
      if (Platform.OS === 'web') {
        for (const style of this._styles) {
          if (style.viewsRef) {
            style.viewsRef.remove(this);
          }
        }
      } else if (this._viewTag !== -1) {
        for (const style of this._styles) {
          if (style?.viewDescriptors) {
            style.viewDescriptors.remove(this._viewTag);
          }
        }
        if (this.props.animatedProps?.viewDescriptors) {
          this.props.animatedProps.viewDescriptors.remove(this._viewTag);
        }
      }
    }

    _reattachNativeEvents(prevProps) {
      const node = this._getEventViewRef();
      const attached = new Set();
      let viewTag;

      for (const key in this.props) {
        const prop = this.props[key];
        if (
          prop?.current &&
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
          prop?.current &&
          prop.current instanceof WorkletEventHandler &&
          prop.current.reattachNeeded
        ) {
          prop.current.unregisterFromEvents();
        }
      }

      for (const key in this.props) {
        const prop = this.props[key];
        if (
          prop?.current &&
          prop.current instanceof WorkletEventHandler &&
          prop.current.reattachNeeded
        ) {
          prop.current.registerForEvents(viewTag, key);
          prop.current.reattachNeeded = false;
        }
      }
    }

    // The system is best designed when setNativeProps is implemented. It is
    // able to avoid re-rendering and directly set the attributes that changed.
    // However, setNativeProps can only be implemented on native components
    // If you want to animate a composite component, you need to re-render it.
    // In this case, we have a fallback that uses forceUpdate.
    _animatedPropsCallback = () => {
      if (this._component == null) {
        // AnimatedProps is created in will-mount because it's used in render.
        // But this callback may be invoked before mount in async mode,
        // In which case we should defer the setNativeProps() call.
        // React may throw away uncommitted work in async mode,
        // So a deferred call won't always be invoked.
        this._invokeAnimatedPropsCallbackOnMount = true;
      } else if (typeof this._component.setNativeProps !== 'function') {
        this.forceUpdate();
      } else {
        this._component.setNativeProps(this._propsAnimated.__getValue());
      }
    };

    _updateFromNative(props) {
      if (options.setNativeProps) {
        options.setNativeProps(this._component, props);
      } else {
        // eslint-disable-next-line no-unused-expressions
        this._component.setNativeProps?.(props);
      }
    }

    _attachPropUpdater() {
      const viewTag = findNodeHandle(this);
      NODE_MAPPING.set(viewTag, this);
      if (NODE_MAPPING.size === 1) {
        ReanimatedEventEmitter.addListener('onReanimatedPropsChange', listener);
      }
    }

    _attachAnimatedStyles() {
      const styles = flattenArray(this.props.style);
      this._styles = styles;
      let viewTag, viewName;
      if (Platform.OS === 'web') {
        viewTag = findNodeHandle(this);
        viewName = null;
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
        if (
          hostInstance &&
          this._hasReanimated2Props(styles) &&
          hostInstance.viewConfig
        ) {
          adaptViewConfig(hostInstance.viewConfig);
        }
      }
      this._viewTag = viewTag;

      styles.forEach((style) => {
        if (style?.viewDescriptors) {
          style.viewDescriptors.add({ tag: viewTag, name: viewName });
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
        }
      });
      // attach animatedProps property
      if (this.props.animatedProps?.viewDescriptors) {
        this.props.animatedProps.viewDescriptors.add({
          tag: viewTag,
          name: viewName,
        });
      }
    }

    _hasReanimated2Props(flattenStyles) {
      if (this.props.animatedProps?.viewDescriptors) {
        return true;
      }
      if (this.props.style) {
        for (const style of flattenStyles) {
          // eslint-disable-next-line no-prototype-builtins
          if (style?.hasOwnProperty('viewDescriptors')) {
            return true;
          }
        }
      }
      return false;
    }

    _detachPropUpdater() {
      const viewTag = findNodeHandle(this);
      NODE_MAPPING.delete(viewTag);
      if (NODE_MAPPING.size === 0) {
        ReanimatedEventEmitter.removeAllListeners('onReanimatedPropsChange');
      }
    }

    componentDidUpdate(prevProps) {
      //this._reattachNativeEvents(prevProps);

      this._propsAnimated && this._propsAnimated.setNativeView(this._component);
      this._attachAnimatedStyles();
    }

    _setComponentRef = setAndForwardRef({
      getForwardedRef: () => this.props.forwardedRef,
      setLocalRef: (ref) => {
        // TODO update config
        const tag = findNodeHandle(ref);
        if (
          (this.props.layout || this.props.entering || this.props.exiting) &&
          tag != null
        ) {
          let layout = this.props.layout ? this.props.layout : DefaultLayout;
          let entering = this.props.entering
            ? this.props.entering
            : DefaultEntering;
          let exiting = this.props.exiting
            ? this.props.exiting
            : DefaultExiting;

          if (layout.build) {
            layout = layout.build();
          }

          if (entering.build) {
            entering = entering.build();
          }

          if (exiting.build) {
            exiting = exiting.build();
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

        // TODO: Delete this after React Native also deletes this deprecation helper.
        if (ref != null && ref.getNode == null) {
          ref.getNode = () => {
            console.warn(
              '%s: Calling %s on the ref of an Animated component ' +
                'is no longer necessary. You can now directly use the ref ' +
                'instead. This method will be removed in a future release.',
              ref.constructor.name ?? '<<anonymous>>',
              'getNode()'
            );
            return ref;
          };
        }
      },
    });

    _filterNonAnimatedStyle(inputStyle) {
      const style = {};
      for (const key in inputStyle) {
        const value = inputStyle[key];
          style[key] = value; 
      }
      return style;
    }

    _filterNonAnimatedProps(inputProps) {
      const props = {};
      for (const key in inputProps) {
        const value = inputProps[key];
        if (key === 'style') {
          const styles = flattenArray(value);
          const processedStyle = styles.map((style) => {
            if (style && style.viewDescriptors) {
              // this is how we recognize styles returned by useAnimatedStyle
              style.viewsRef.add(this);
              return style.initial.value;
            } else {
              return style;
            }
          });
          props[key] = this._filterNonAnimatedStyle(
            StyleSheet.flatten(processedStyle)
          );
        } else if (key === 'animatedProps') {
          Object.keys(value.initial.value).forEach((key) => {
            props[key] = value.initial.value[key];
            value.viewsRef.add(this);
          });
        } else if (
          value?.current &&
          value.current instanceof WorkletEventHandler
        ) {
          console.log('eventHAndler uuuuu');
          if (value.current.eventNames.length > 0) {
            value.current.eventNames.forEach((eventName) => {
              props[eventName] = value.current.listeners
                ? value.current.listeners[eventName]
                : dummyListener;
            });
          } else {
            props[key] = dummyListener;
          }
        } else {
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

  return React.forwardRef(function AnimatedComponentWrapper(props, ref) {
    return (
      <AnimatedComponent
        {...props}
        {...(ref == null ? null : { forwardedRef: ref })}
      />
    );
  });
}
