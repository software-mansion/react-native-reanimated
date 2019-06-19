import AnimatedNode from './AnimatedNode';
import { createOrReuseTransformNode } from './AnimatedTransform';

import deepEqual from 'fbjs/lib/areEqual';

function sanitizeMap(inputMap) {
  const map = {};
  for (const key in inputMap) {
    const value = inputMap[key];
    if (value instanceof AnimatedNode) {
      map[key] = value.__nodeID;
    }
  }
  return map;
}

export function createOrReuseMapNode(map, oldNode) {
  const config = sanitizeMap(map);
  if (oldNode && deepEqual(config, oldNode._config)) {
    return oldNode;
  }
  return new AnimatedMap(map, config);
}

/**
 * AnimatedMap should never be directly instantiated, use createOrReuseMapNode
 * in order to make a new instance of this node.
 */
export default class AnimatedMap extends AnimatedNode {
  constructor(map, config) {
    super({ type: 'map', map: config }, Object.values(map));
    this._config = config;
    this._map = map;
  }

  _walkMapAndGetAnimatedValues(map) {
    const updatedMap = {};
    for (const key in map) {
      const value = map[key];
      if (value instanceof AnimatedNode) {
        updatedMap[key] = value.__getValue();
      } else if (value && !Array.isArray(value) && typeof value === 'object') {
        // Support animating nested values (for example: shadowOffset.height)
        updatedMap[key] = this._walkMapAndGetAnimatedValues(value);
      }
    }
    return updatedMap;
  }

  __onEvaluate() {
    return this._walkMapAndGetAnimatedValues(this._map);
  }
}
