import React from 'react';
import {
  NativeModules,
  NativeEventEmitter,
  findNodeHandle,
} from 'react-native';
import ViewStylePropTypes from 'react-native/Libraries/Components/View/ViewStylePropTypes';

import AnimatedProps from './core/AnimatedProps';
import AnimatedEvent from './core/AnimatedEvent';

import invariant from 'fbjs/lib/invariant';

const { ReanimatedModule } = NativeModules;
const EVENT_EMITTER = new NativeEventEmitter(ReanimatedModule);

const NODE_MAPPING = new Map();

function listener(data) {
  const component = NODE_MAPPING.get(data.viewTag);
  component && component._updateFromNative(data.props);
}

export default function createAnimatedComponent(Component) {
  invariant(
    typeof Component === 'string' ||
      (Component.prototype && Component.prototype.isReactComponent),
    '`createAnimatedComponent` does not support stateless functional components; ' +
      'use a class component instead.'
  );

  class AnimatedComponent extends React.Component {
    _invokeAnimatedPropsCallbackOnMount = false;

    _eventDetachers = [];

    static __skipSetNativeProps_FOR_TESTS_ONLY = false;

    constructor(props) {
      super(props);
      this._setComponentRef = this._setComponentRef.bind(this);
    }

    componentWillUnmount() {
      this._detachPropUpdater();
      this._propsAnimated && this._propsAnimated.__detach();
      this._detachNativeEvents();
    }

    setNativeProps(props) {
      this._component.setNativeProps(props);
    }

    componentWillMount() {
      this._attachProps(this.props);
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

    _attachNativeEvents() {
      // Make sure to get the scrollable node for components that implement
      // `ScrollResponder.Mixin`.
      const scrollableNode = this._component.getScrollableNode
        ? this._component.getScrollableNode()
        : this._component;

      for (const key in this.props) {
        const prop = this.props[key];
        if (prop instanceof AnimatedEvent) {
          prop.attachEvent(scrollableNode, key);
          this._eventDetachers.push(() =>
            prop.detachEvent(scrollableNode, key)
          );
        }
      }
    }

    _detachNativeEvents() {
      this._eventDetachers.forEach(remove => remove());
      this._eventDetachers = [];
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
      } else if (
        AnimatedComponent.__skipSetNativeProps_FOR_TESTS_ONLY ||
        typeof this._component.setNativeProps !== 'function'
      ) {
        this.forceUpdate();
      } else {
        this._component.setNativeProps(this._propsAnimated.__getValue());
      }
    };

    _attachProps(nextProps) {
      const oldPropsAnimated = this._propsAnimated;

      this._propsAnimated = new AnimatedProps(
        nextProps,
        this._animatedPropsCallback
      );

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

    _updateFromNative(props) {
      this._component.setNativeProps(props);
    }

    _attachPropUpdater() {
      const viewTag = findNodeHandle(this);
      NODE_MAPPING.set(viewTag, this);
      if (NODE_MAPPING.size === 1) {
        EVENT_EMITTER.addListener('onReanimatedPropsChange', listener);
      }
    }

    _detachPropUpdater() {
      const viewTag = findNodeHandle(this);
      NODE_MAPPING.delete(viewTag);
      if (NODE_MAPPING.size === 0) {
        EVENT_EMITTER.removeAllListeners('onReanimatedPropsChange');
      }
    }

    componentWillReceiveProps(newProps) {
      this._attachProps(newProps);
    }

    componentDidUpdate(prevProps) {
      if (this._component !== this._prevComponent) {
        this._propsAnimated.setNativeView(this._component);
      }
      if (this._component !== this._prevComponent || prevProps !== this.props) {
        this._detachNativeEvents();
        this._attachNativeEvents();
      }
    }

    render() {
      const props = this._propsAnimated.__getProps();
      return (
        <Component {...props} ref={this._setComponentRef} collapsable={false} />
      );
    }

    _setComponentRef(c) {
      this._prevComponent = this._component;
      this._component = c;
    }

    // A third party library can use getNode()
    // to get the node reference of the decorated component
    getNode() {
      return this._component;
    }
  }

  const propTypes = Component.propTypes;

  AnimatedComponent.propTypes = {
    style: function(props, propName, componentName) {
      if (!propTypes) {
        return;
      }

      for (const key in ViewStylePropTypes) {
        if (!propTypes[key] && props[key] !== undefined) {
          console.warn(
            'You are setting the style `{ ' +
              key +
              ': ... }` as a prop. You ' +
              'should nest it in a style object. ' +
              'E.g. `{ style: { ' +
              key +
              ': ... } }`'
          );
        }
      }
    },
  };

  return AnimatedComponent;
}
