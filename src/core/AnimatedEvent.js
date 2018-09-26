import { findNodeHandle, Platform } from 'react-native';
import ReanimatedModule from '../ReanimatedModule';

import AnimatedNode from './AnimatedNode';
import AnimatedValue from './AnimatedValue';
import AnimatedAlways from './AnimatedAlways';

import invariant from 'fbjs/lib/invariant';
import createEventObjectProxyPolyfill from './createEventObjectProxyPolyfill';

function sanitizeArgMapping(argMapping) {
  // Find animated values in `argMapping` and create an array representing their
  // key path inside the `nativeEvent` object. Ex.: ['contentOffset', 'x'].
  const eventMappings = [];
  const alwaysNodes = [];

  const traverse = (value, path) => {
    if (value instanceof AnimatedValue) {
      eventMappings.push(path.concat(value.__nodeID));
    } else if (typeof value === 'object' && value.__val) {
      eventMappings.push(path.concat(value.__val.__nodeID));
    } else if (typeof value === 'function') {
      const node = new AnimatedValue(0);
      alwaysNodes.push(new AnimatedAlways(value(node)));
      eventMappings.push(path.concat(node.__nodeID));
    } else if (typeof value === 'object') {
      for (const key in value) {
        traverse(value[key], path.concat(key));
      }
    }
  };

  invariant(
    argMapping[0] && argMapping[0].nativeEvent,
    'Native driven events only support animated values contained inside `nativeEvent`.'
  );

  // Assume that the event containing `nativeEvent` is always the first argument.
  const ev = argMapping[0].nativeEvent;
  if (typeof ev === 'object') {
    traverse(ev, []);
  } else if (typeof ev === 'function') {
    const proxyHandler = {
      get: function(target, name) {
        if (name === '__isProxy') {
          return true;
        }
        if (!target[name] && name !== '__val') {
          target[name] = new Proxy({}, proxyHandler);
        }
        return target[name];
      },
      set: function(target, prop, value) {
        if (prop === '__val') {
          target[prop] = value;
        }
      },
    };

    const proxy =
      Platform.OS === 'android'
        ? createEventObjectProxyPolyfill()
        : new Proxy({}, proxyHandler);
    alwaysNodes.push(new AnimatedAlways(ev(proxy)));
    traverse(proxy, []);
  }

  return { eventMappings, alwaysNodes };
}

export default class AnimatedEvent extends AnimatedNode {
  constructor(argMapping, config = {}) {
    const { eventMappings, alwaysNodes } = sanitizeArgMapping(argMapping);
    super({ type: 'event', argMapping: eventMappings });
    this._alwaysNodes = alwaysNodes;
  }

  // The below field is a temporary workaround to make AnimatedEvent object be recognized
  // as Animated.event event callback and therefore filtered out from being send over the
  // bridge which was causing the object to be frozen in JS.
  __isNative = true;

  attachEvent(viewRef, eventName) {
    for (let i = 0; i < this._alwaysNodes.length; i++) {
      this._alwaysNodes[i].__attach();
    }
    this.__attach();
    const viewTag = findNodeHandle(viewRef);
    ReanimatedModule.attachEvent(viewTag, eventName, this.__nodeID);
  }

  detachEvent(viewRef, eventName) {
    for (let i = 0; i < this._alwaysNodes.length; i++) {
      this._alwaysNodes[i].isNativelyInitialized() &&
        this._alwaysNodes[i].__detach();
    }
    const viewTag = findNodeHandle(viewRef);
    ReanimatedModule.detachEvent(viewTag, eventName, this.__nodeID);
    this.__detach();
  }
}
