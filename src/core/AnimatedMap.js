import { Platform } from 'react-native';
import { val } from '../val';
import { createAnimatedAlways } from './AnimatedAlways';
import AnimatedNode from './AnimatedNode';
import AnimatedParam from './AnimatedParam';
import InternalAnimatedValue from './AnimatedValue';
import createEventObjectProxyPolyfill from './createEventObjectProxyPolyfill';


function getNode(node) {
  if (Platform.OS === 'web') {
    return node;
  }
  return node.__nodeID;
}

Array.fromEnd = (elements) => {
  if (!Array.isArray(elements)) {
    throw new Error(`Array.fromEnd: ${elements} must be an array`);
  }
  return elements.fromEnd();
}

Object.defineProperty(Array.prototype, 'fromEnd', {
  value(value = true) {
    Object.defineProperty(this, '__fromEnd', {
      value,
      configurable: false,
      enumerable: false,
      writable: false,
    });

    return this;
  }
});

function traverseArray(array) {
  return array.__fromEnd ?
    array.reduce((map, current, index) => {
      map[(index + 1) * -1] = current;
      return map;
    }, {}) :
    array;
}

export function sanitizeArgMapping(argMapping) {
  // Find animated values in `argMapping` and create an array representing their key path inside
  const children = [];
  const objectMappings = [];
  const alwaysNodes = [];


  const traverse = (value, path) => {
    if (value instanceof AnimatedNode && (value.__source() instanceof InternalAnimatedValue || value instanceof AnimatedParam)) {
      children.push(value);
      objectMappings.push(path.concat(getNode(value)));
    } else if (typeof value === 'object' && value.__val) {
      children.push(value.__val);
      objectMappings.push(path.concat(getNode(value.__val)));
    } else if (typeof value === 'function' && value.length === 0) {
      const stub = new InternalAnimatedValue(0);
      const node = value();
      const alwaysNode = createAnimatedAlways(node);
      node.__addChild(stub);
      children.push(stub);
      alwaysNodes.push(alwaysNode);
      objectMappings.push(path.concat(getNode(alwaysNode)));
    } else if (typeof value === 'function') {
      const node = new InternalAnimatedValue(0);
      children.push(node);
      alwaysNodes.push(createAnimatedAlways(value(node)));
      objectMappings.push(path.concat(getNode(node)));
    } else if (typeof value === 'object') {
      if (Array.isArray(value)) {
        value = traverseArray(value);
      }
      for (const key in value) {
        traverse(value[key], path.concat(key));
      }
    } else {
      let val;
      switch (typeof value) {
        case "boolean":
          val = value ? 1 : 0;
          break;
        case "number":
        case "string":
          val = value;
          break;
        default:
          throw new Error('Reanimated map: bad input', value);
      }

      const node = new InternalAnimatedValue(val, true);
      children.push(node);
      objectMappings.push(path.concat(getNode(node)));
    }
  };

  if (typeof argMapping === 'object' || (typeof argMapping === 'function' && argMapping.length === 0)) {
    traverse(argMapping, []);
  } else if (typeof argMapping === 'function') {
    const proxyHandler = {
      get: function (target, name) {
        if (name === '__isProxy') {
          return true;
        }
        if (!target[name] && name !== '__val') {
          target[name] = new Proxy({}, proxyHandler);
        }

        return target[name];
      },
      set: function (target, prop, value) {
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

  return { objectMappings, children, alwaysNodes };
}

export default class AnimatedMap extends AnimatedNode {
  _alwaysNodes;
  constructor(argMapping, config = {}) {
    if (Platform.OS !== 'android') {
      throw new Error('Currently experimental direct manipulation are available only on Android');
    }

    const { objectMappings, children, alwaysNodes } = sanitizeArgMapping(argMapping);
    super({
      type: 'map',
      argMapping: objectMappings
    }, [...children, ...alwaysNodes]);

    this._alwaysNodes = alwaysNodes;
  }

  __onEvaluate() {
    return val(this);
  }
}

export function createAnimatedMap(argMapping, config) {
  return new AnimatedMap(argMapping, config);
}

Object.defineProperty(createAnimatedMap, 'fromEnd', {
  value(array) {
    return this(Array.fromEnd(array));
  },
  configurable: false,
  enumerable: true,
  writable: false,
});
