import { Platform } from 'react-native';

import AnimatedNode from './AnimatedNode';
import InternalAnimatedValue from './AnimatedValue';
import { createAnimatedAlways } from './AnimatedAlways';

import createEventObjectProxyPolyfill from './createEventObjectProxyPolyfill';

export function sanitizeArgMapping(argMapping) {
  // Find animated values in `argMapping` and create an array representing their
  // key path inside the `nativeEvent` object. Ex.: ['contentOffset', 'x'].
  const objectMappings = [];
  const alwaysNodes = [];

  const getNode = node => {
    if (Platform.OS === 'web') {
      return node;
    }
    return node.__nodeID;
  };

  const traverse = (value, path) => {
    if (value instanceof InternalAnimatedValue) {
      objectMappings.push(path.concat(getNode(value)));
    } else if (typeof value === 'object' && value.__val) {
      objectMappings.push(path.concat(getNode(value.__val)));
    } else if (typeof value === 'function') {
      const node = new InternalAnimatedValue(0);
      alwaysNodes.push(createAnimatedAlways(value(node)));
      objectMappings.push(path.concat(getNode(node)));
    } else if (typeof value === 'object') {
      for (const key in value) {
        traverse(value[key], path.concat(key));
      }
    }
  };

  if (typeof argMapping === 'object') {
    traverse(argMapping, []);
  } else if (typeof argMapping === 'function') {
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
      typeof Proxy === 'function'
        ? new Proxy({}, proxyHandler)
        : createEventObjectProxyPolyfill();
    alwaysNodes.push(createAnimatedAlways(argMapping(proxy)));
    traverse(proxy, []);
  }

  return { objectMappings, alwaysNodes };
}

export default class AnimatedMap extends AnimatedNode {
  constructor(argMapping, config = {}) {
    const { objectMappings, alwaysNodes } = sanitizeArgMapping(argMapping);
    super({ type: 'map', argMapping: objectMappings });
    this._alwaysNodes = alwaysNodes;
  }
}

export function createAnimatedMap(argMapping, config) {
  return new AnimatedMap(argMapping, config);
}
