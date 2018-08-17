import AnimatedNode from './AnimatedNode';

import deepEqual from 'fbjs/lib/areEqual';

function sanitizeTransform(inputTransform) {
  const outputTransform = [];
  inputTransform.forEach(transform => {
    for (const key in transform) {
      const value = transform[key];
      if (value instanceof AnimatedNode) {
        outputTransform.push({
          property: key,
          nodeID: value.__nodeID,
        });
      }
    }
  });
  return outputTransform;
}

function extractAnimatedParentNodes(transform) {
  const parents = [];
  transform.forEach(transform => {
    for (const key in transform) {
      const value = transform[key];
      if (value instanceof AnimatedNode) {
        parents.push(value);
      }
    }
  });
  return parents;
}

export function createOrReuseTransformNode(transform, oldNode) {
  const config = sanitizeTransform(transform);
  if (oldNode && deepEqual(config, oldNode._config)) {
    oldNode.__setNewTransform(transform);
    return oldNode;
  }
  return new AnimatedTransform(transform, config);
}

export default class AnimatedTransform extends AnimatedNode {
  constructor(transform, config) {
    super(
      { type: 'transform', transform: config },
      extractAnimatedParentNodes(transform)
    );
    this._config = config;
    this._transform = transform;
  }

  __setNewTransform(newTransform) {
    this._transform = newTransform;
  }
  __getProps() {
    const result = [];
    for (let i = 0; i < this._transform.length; i++) {
      const transform = this._transform[i];
      for (const key in transform) {
        const value = transform[key];
        if (!(value instanceof AnimatedNode)) {
          const singleTransform = {};
          singleTransform[key] = value;
          result.push(singleTransform);
        }
      }
    }
    return result;
  }

  __onEvaluate() {
    return this._transform.map(transform => {
      const result = {};
      for (const key in transform) {
        const value = transform[key];
        if (value instanceof AnimatedNode) {
          result[key] = value.__getValue();
        }
      }
      return result;
    });
  }
}
