import React from 'react';
import { findNodeHandle, Platform, StyleSheet } from 'react-native';
import ReanimatedEventEmitter from './ReanimatedEventEmitter';

import AnimatedEvent from './core/AnimatedEvent';
import AnimatedNode from './core/AnimatedNode';
import { createOrReusePropsNode } from './core/AnimatedProps';
import AnimatedCallFunc from "./core/AnimatedCallFunc";

import invariant from 'fbjs/lib/invariant';

const NODE_MAPPING = new Map();

function listener(data) {
  const component = NODE_MAPPING.get(data.viewTag);
  component && component._updateFromNative(data.props);
}

const platformProps = Platform.select({
  web: {},
  default: { collapsable: false },
});

function getEventNode(node) {
  if (node instanceof AnimatedEvent) {
    return node;
  } else if (node instanceof AnimatedCallFunc) {
    throw new Error('events nested in procs are not yet supported');
  } else {
    return false;
  }
}

function forEachEvent(props, cb) {
  let prop;
  for (const key in props) {
    prop = props[key];
    prop = Array.isArray(prop) ? prop : [prop];
    prop.forEach(element => {
      const node = getEventNode(element);
      if (node && node instanceof AnimatedEvent) {
        cb(node, key);
      }
    });
  }
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
    }

    componentWillUnmount() {
      this._detachPropUpdater();
      this._propsAnimated && this._propsAnimated.__detach();
      this._detachNativeEvents();
    }

    setNativeProps(props) {
      this._component.setNativeProps(props);
    }

    componentDidMount() {
      if (this._invokeAnimatedPropsCallbackOnMount) {
        this._invokeAnimatedPropsCallbackOnMount = false;
        this._animatedPropsCallback();
      }

      this._propsAnimated.setNativeView(this._component);
      this._attachNativeEvents();
      this._attachPropUpdater();
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
      const nativeUpdate = {};

      forEachEvent(this.props, (ev, key) => {
        ev.attachEvent(node, key);
        nativeUpdate[key] = true;
      });

      this.setNativeProps(nativeUpdate)
    }

    _detachNativeEvents() {
      const node = this._getEventViewRef();
      forEachEvent(this.props, (ev, key) => ev.detachEvent(node, key));
    }

    _reattachNativeEvents(prevProps) {
      const node = this._getEventViewRef();
      const attached = new Set();
      const nextEvts = new Set();

      forEachEvent(this.props, (ev, key) => nextEvts.add(ev.__nodeID));

      forEachEvent(prevProps, (ev, key) => {
        if (!nextEvts.has(ev.__nodeID)) {
          // event was in prev props but not in current props, we detach
          ev.detachEvent(node, key);
          nativeUpdate[key] = false;
        } else {
          // event was in prev and is still in current props
          attached.add(ev.__nodeID);
        }
      });

      forEachEvent(this.props, (ev, key) => {
        if (!attached.has(ev.__nodeID)) {
          // not yet attached
          ev.attachEvent(node, key);
          nativeUpdate[key] = true;
        }
      });
          
      this.setNativeProps(nativeUpdate);
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

      this._propsAnimated.setNativeView(this._component);
    }

    _setComponentRef = c => {
      if (c !== this._component) {
        this._component = c;
      }
    };

    _filterNonAnimatedStyle(inputStyle) {
      const style = {};
      for (const key in inputStyle) {
        const value = inputStyle[key];
        if (!(value instanceof AnimatedNode) && key !== 'transform') {
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
          props[key] = this._filterNonAnimatedStyle(StyleSheet.flatten(value));
        } else if (Array.isArray(value) && value.some((v) => v instanceof AnimatedNode)) {
          const funcEvent = value.find((v) => typeof v === 'function');
          if (funcEvent) {
            props[key] = funcEvent;
          }
        } else if (!(value instanceof AnimatedNode)) {
          props[key] = value;
        }
      }
      return props;
    }

    _platformProps = Platform.select({
      web: {},
      default: { collapsable: false },
    });

    render() {
      const props = this._filterNonAnimatedProps(this.props);
      return (
        <Component {...props} ref={this._setComponentRef} {...this._platformProps} />
      );
    }

    // A third party library can use getNode()
    // to get the node reference of the decorated component
    getNode() {
      return this._component;
    }
  }

  return AnimatedComponent;
}
