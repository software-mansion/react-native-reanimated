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
    } else if (typeof value === 'function') {
      const node = new InternalAnimatedValue(0);
      children.push(node);
      alwaysNodes.push(createAnimatedAlways(value(node)));
      objectMappings.push(path.concat(getNode(node)));
    } else if (typeof value === 'object') {
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
  
  return { objectMappings, children, alwaysNodes };
}

export default class AnimatedMap extends AnimatedNode {
  _alwaysNodes;
  constructor(argMapping, config = {}) {
    const { objectMappings, children, alwaysNodes } = sanitizeArgMapping(argMapping);
    
    super({
      type: 'map',
      argMapping: objectMappings
    }, children);

    this._alwaysNodes = alwaysNodes;
  }

  __onEvaluate() {
    return val(this);
  }
  
  __attach() {
    const deps = [...this.__inputNodes, ...this._alwaysNodes];
    deps.forEach(n => n.__attach());
    super.__attach();
  }

  __detach() {
    const deps = [...this.__inputNodes, ...this._alwaysNodes];
    super.__detach();
    deps.forEach(n => n.isNativelyInitialized() && n.__detach());
  }
  
}

export function createAnimatedMap(argMapping, config) {
  return new AnimatedMap(argMapping, config);
}