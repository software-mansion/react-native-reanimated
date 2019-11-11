import { Platform } from 'react-native';

import AnimatedNode from './AnimatedNode';
import InternalAnimatedValue from './AnimatedValue';
import AnimatedParam from './AnimatedParam';
import { createAnimatedAlways } from './AnimatedAlways';
import AnimatedFunction from './AnimatedFunction';
import AnimatedCallFunc from './AnimatedCallFunc';
import { createAnimatedParam } from './AnimatedParam';
import { val } from '../val';

import createEventObjectProxyPolyfill from './createEventObjectProxyPolyfill';

function getNode(node) {
  if (Platform.OS === 'web') {
    return node;
  }
  return node.__nodeID;
}

export function sanitizeArgMapping(argMapping) {
  // Find animated values in `argMapping` and create an array representing their key path inside
  const objectMappings = [];
  const alwaysNodes = [];

  
  const traverse = (value, path) => {
    if (value instanceof AnimatedNode && (value.__source() instanceof InternalAnimatedValue || value instanceof AnimatedParam)) {
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
  _alwaysNodes;
  constructor(type, argMapping, alwaysNodes, config = {}) {
    super({ type, argMapping }, alwaysNodes);
    this._alwaysNodes = alwaysNodes;
  }

  __onEvaluate() {
    return val(this);
  }

  static merge(a, b) {
    const configA = AnimatedMap.extractMapping(a);
    const configB = AnimatedMap.extractMapping(b);
    const type = configA.type || 'map';
    return new AnimatedMap(
      type,
      [...configA.argMapping, ...configB.argMapping],
      [...configA.alwaysNodes, ...configB.alwaysNodes],
      config
    );
  }

  static assign(a, b) {
    const configA = AnimatedMap.extractMapping(a);
    const configB = AnimatedMap.extractMapping(b);
    const type = configA.type || 'map';
    return new AnimatedMap(
      type,
      _.intersection(configA.argMapping, configB.argMapping),
      _.intersection(configA.alwaysNodes, configB.alwaysNodes),
      config
    );
  }

  static extractMapping(arg) {
    if (arg instanceof AnimatedMap) {
      return {
        argMapping: arg.__nodeConfig.argMapping,
        alwaysNodes: arg._alwaysNodes,
        type: arg.__nodeConfig.type
      }
    } else if (typeof arg === 'object' && arg) {
      const { alwaysNodes, objectMappings } = sanitizeArgMapping(arg);
      return {
        argMapping: objectMappings,
        alwaysNodes
      };
    } else {
      return {
        argMapping: [],
        alwaysNodes: []
      };
    }
  }
  
}

export function createAnimatedMap(argMapping, config) {
  const { objectMappings, alwaysNodes } = sanitizeArgMapping(argMapping);
  return new AnimatedMap('map', objectMappings, alwaysNodes, config);
}

/*
export function createAnimatedCallMap(cb) {
  const params = new Array(cb.length);
  for (let i = 0; i < params.length; i++) {
    params[i] = createAnimatedParam();
  }

  let what = cb(...params);
  console.log(what)
  if (typeof what === 'object' && what instanceof AnimatedNode === false) {
    what = createAnimatedMap(what);
  } else if (what instanceof AnimatedMap === false) {
    throw new Error('map proc received wrong args', what);
  }
  const func = new AnimatedFunction(what, ...params);

  return (...args) => {
    if (args.length !== params.length) {
      throw new Error(
        'Parameter mismatch when calling reanimated function. Expected ' +
        params.length +
        ' parameters, got ' +
        args.length +
        '.'
      );
    }
    return new AnimatedCallFunc('callfunc', func, args, params);
  };
}
*/