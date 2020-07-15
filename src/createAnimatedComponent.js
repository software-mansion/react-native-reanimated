import React from 'react';
import { findNodeHandle, Platform, StyleSheet } from 'react-native';
import ReanimatedEventEmitter from './ReanimatedEventEmitter';

import AnimatedEvent from './core/AnimatedEvent';
import AnimatedNode from './core/AnimatedNode';
import { createOrReusePropsNode } from './core/AnimatedProps';
import WorkletEventHandler from './reanimated2/WorkletEventHandler';

import invariant from 'fbjs/lib/invariant';

const setAndForwardRef = require('react-native/Libraries/Utilities/setAndForwardRef');

const NODE_MAPPING = new Map();

function listener(data) {
  const component = NODE_MAPPING.get(data.viewTag);
  component && component._updateFromNative(data.props);
}

function dummyListener() {
  // empty listener we use to assign to listener properties for which animated
  // event is used.
}

function hasAnimatedNodes(value) {
  if (value instanceof AnimatedNode) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(item => hasAnimatedNodes(item));
  }
  if (typeof value === 'object') {
    return Object.keys(value).some(key => hasAnimatedNodes(value[key]));
  }
  return false;
}

export default function createAnimatedComponent(Component) {
  invariant(
    typeof Component !== 'function' ||
      (Component.prototype && Component.prototype.isReactComponent),
    '`createAnimatedComponent` does not support stateless functional components; ' +
      'use a class component instead.'
  );

  class AnimatedComponent extends React.Component {
    _invokeAnimatedPropsCallbackOnMount = false;

    constructor(props) {
      super(props);
      this._attachProps(this.props);

      this.state = {
        animatedStyle: {},
      };
    }

    componentWillUnmount() {
      this._detachPropUpdater();
      this._propsAnimated && this._propsAnimated.__detach();
      this._detachNativeEvents();
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

    _setAnimatedStyle(animatedStyle) {
      this.setState({ animatedStyle });
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
      const viewTag = findNodeHandle(node);

      for (const key in this.props) {
        const prop = this.props[key];
        if (prop instanceof AnimatedEvent) {
          prop.attachEvent(node, key);
        } else if (prop instanceof WorkletEventHandler) {
          prop.registerForEvents(viewTag, key);
        }
      }
    }

    _detachNativeEvents() {
      const node = this._getEventViewRef();

      for (const key in this.props) {
        const prop = this.props[key];
        if (prop instanceof AnimatedEvent) {
          prop.detachEvent(node, key);
        } else if (prop instanceof WorkletEventHandler) {
          prop.unregisterFromEvents();
        }
      }
    }

    _reattachNativeEvents(prevProps) {
      const node = this._getEventViewRef();
      const attached = new Set();
      const nextEvts = new Set();
      for (const key in this.props) {
        const prop = this.props[key];
        if (prop instanceof AnimatedEvent) {
          nextEvts.add(prop.__nodeID);
        }
      }
      for (const key in prevProps) {
        const prop = this.props[key];
        if (prop instanceof AnimatedEvent) {
          if (!nextEvts.has(prop.__nodeID)) {
            // event was in prev props but not in current props, we detach
            prop.detachEvent(node, key);
          } else {
            // event was in prev and is still in current props
            attached.add(prop.__nodeID);
          }
        }
      }
      for (const key in this.props) {
        const prop = this.props[key];
        if (prop instanceof AnimatedEvent && !attached.has(prop.__nodeID)) {
          // not yet attached
          prop.attachEvent(node, key);
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

    _attachProps(nextProps) {
      const oldPropsAnimated = this._propsAnimated;

      this._propsAnimated = createOrReusePropsNode(
        nextProps,
        this._animatedPropsCallback,
        oldPropsAnimated
      );
      // If prop node has been reused we don't need to call into "__detach"
      if (oldPropsAnimated !== this._propsAnimated) {
        // When you call detach, it removes the element from the parent list
        // of children. If it goes to 0, then the parent also detaches itself
        // and so on.
        // An optimization is to attach the new elements and THEN detach the old
        // ones instead of detaching and THEN attaching.
        // This way the intermediate state isn't to go to 0 and trigger
        // this expensive recursive detaching to then re-attach everything on
        // the very next operation.
        oldPropsAnimated && oldPropsAnimated.__detach();
      }
    }

    _updateFromNative(props) {
      this._component.setNativeProps(props);
    }

    _attachPropUpdater() {
      const viewTag = findNodeHandle(this);
      NODE_MAPPING.set(viewTag, this);
      if (NODE_MAPPING.size === 1) {
        ReanimatedEventEmitter.addListener('onReanimatedPropsChange', listener);
      }
    }

    _attachAnimatedStyles() {
      const styles = Array.isArray(this.props.style)
        ? this.props.style
        : [this.props.style];
      const viewTag = findNodeHandle(this);
      styles.forEach(style => {
        if (style && style.viewTag !== undefined) {
          style.viewTag.value = viewTag;
        }
      });
      // attach animatedProps property
      if (this.props.animatedProps) {
        this.props.animatedProps.viewTag.value = viewTag;
      }
    }

    _detachPropUpdater() {
      const viewTag = findNodeHandle(this);
      NODE_MAPPING.delete(viewTag);
      if (NODE_MAPPING.size === 0) {
        ReanimatedEventEmitter.removeAllListeners('onReanimatedPropsChange');
      }
    }

    componentDidUpdate(prevProps) {
      this._attachProps(this.props);
      this._reattachNativeEvents(prevProps);

      this._propsAnimated && this._propsAnimated.setNativeView(this._component);
    }

    _setComponentRef = setAndForwardRef({
      getForwardedRef: () => this.props.forwardedRef,
      setLocalRef: ref => {
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
        if (!hasAnimatedNodes(value)) {
          style[key] = value;
        }
      }
      return style;
    }

    _filterNonAnimatedProps(inputProps) {
      const props = {};
      for (const key in inputProps) {
        const value = inputProps[key];
        if (key === 'style') {
          const styles = Array.isArray(value) ? value : [value];
          const processedStyle = styles.map(style => {
            if (style && style.viewTag) {
              // this is how we recognize styles returned by useAnimatedStyle
              if (style.viewRef.current === null) {
                style.viewRef.current = this;
              }
              return style.initial;
            } else {
              return style;
            }
          });
          props[key] = this._filterNonAnimatedStyle(
            StyleSheet.flatten(processedStyle)
          );
        } else if (key === 'animatedProps') {
          Object.keys(value.initial).forEach(key => {
            props[key] = value.initial[key];
          });
        } else if (value instanceof AnimatedEvent) {
          // we cannot filter out event listeners completely as some components
          // rely on having a callback registered in order to generate events
          // alltogether. Therefore we provide a dummy callback here to allow
          // native event dispatcher to hijack events.
          props[key] = dummyListener;
        } else if (value instanceof WorkletEventHandler) {
          if (value.eventNames.length > 0) {
            value.eventNames.forEach(
              eventName => (props[eventName] = dummyListener)
            );
          } else {
            props[key] = dummyListener;
          }
        } else if (!(value instanceof AnimatedNode)) {
          props[key] = value;
        }
      }
      return props;
    }

    render() {
      const { style = {}, ...props } = this._filterNonAnimatedProps(this.props);
      const platformProps = Platform.select({
        web: {},
        default: { collapsable: false },
      });
      return (
        <Component
          style={[style, this.state.animatedStyle]}
          {...props}
          ref={this._setComponentRef}
          {...platformProps}
        />
      );
    }
  }

  AnimatedComponent.displayName = `AnimatedComponent(${Component.displayName ||
    Component.name ||
    'Component'})`;

  return React.forwardRef(function AnimatedComponentWrapper(props, ref) {
    return (
      <AnimatedComponent
        {...props}
        {...(ref == null ? null : { forwardedRef: ref })}
      />
    );
  });
}
