import { findNodeHandle, Platform } from 'react-native';
import ReanimatedModule from '../ReanimatedModule';

import AnimatedNode from './AnimatedNode';
import AnimatedValue from './AnimatedValue';
import AnimatedAlways from './AnimatedAlways';

import invariant from 'fbjs/lib/invariant';

//TODO remove after update of JSC
function androidProxyPolyfill() {
  const v = {
    translationX: {},
    translationY: {},
    state: {},
    oldState: {},
    absoluteX: {},
    absoluteY: {},
    x: {},
    y: {},
    velocityX: {},
    velocityY: {},
    scale: {},
    focalX: {},
    focalY: {},
    rotation: {},
    anchorX: {},
    anchorY: {},
    velocity: {},
    layout: {
      x: {},
      y: {},
      width: {},
      height: {},
    },
  };
  function traverse(obj) {
    for (key in obj) {
      obj[key].isProxy = true;
      traverse(obj.key);
    }
  }
  traverse(v);
  return v;
}

// TODO there's no point why not to use "alwaysNodes"
// as a field of object except from the error
// "Malformated call from JS: field sizes are different"
const EVENTS_TO_ALWAYS_NODES = new Map();

function sanitizeArgMapping(argMapping) {
  // Find animated values in `argMapping` and create an array representing their
  // key path inside the `nativeEvent` object. Ex.: ['contentOffset', 'x'].
  const eventMappings = [];
  const alwaysNodes = [];

  const traverse = (value, path) => {
    if (value instanceof AnimatedValue) {
      eventMappings.push(path.concat(value.__nodeID));
    } else if (typeof value === 'object' && value.val) {
      eventMappings.push(path.concat(value.val.__nodeID));
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
        if (name === 'isProxy') {
          return true;
        }
        if (!target[name] && name !== 'val') {
          target[name] = new Proxy({}, proxyHandler);
        }
        return target[name];
      },
      set: function(target, prop, value) {
        if (prop === 'val') {
          target[prop] = value;
        }
      },
    };

    const proxy =
      Platform.OS === 'android'
        ? androidProxyPolyfill()
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
    EVENTS_TO_ALWAYS_NODES.set(this.__nodeID, alwaysNodes);
  }

  attachEvent(viewRef, eventName) {
    const alwaysNodes = EVENTS_TO_ALWAYS_NODES.get(this.__nodeID);
    for (let i = 0; i < alwaysNodes.length; i++) {
      alwaysNodes[i].__attach();
    }
    this.__attach();
    const viewTag = findNodeHandle(viewRef);
    ReanimatedModule.attachEvent(viewTag, eventName, this.__nodeID);
  }

  detachEvent(viewRef, eventName) {
    const alwaysNodes = EVENTS_TO_ALWAYS_NODES.get(this.__nodeID);

    for (let i = 0; i < alwaysNodes.length; i++) {
      alwaysNodes[i].isNativelyInitialized() && alwaysNodes[i].__detach();
    }

    const viewTag = findNodeHandle(viewRef);
    ReanimatedModule.detachEvent(viewTag, eventName, this.__nodeID);
    this.__detach();
  }

  onUnmount() {
    EVENTS_TO_ALWAYS_NODES.delete(this.__nodeID);
  }
}
