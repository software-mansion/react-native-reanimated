import AnimatedNode from './AnimatedNode';
import createOrReuseArrayFromNode from './AnimatedArrayFrom';

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
      } else {
        outputTransform.push({
          property: key,
          value,
        });
      }
    }
  });
  return outputTransform;
}

function mapMatrixArrays(inputTransform, oldTransform) {
  return inputTransform.map((transform, i) => {
    const obj = {};
    for (const key in transform) {
      const value = transform[key];

      if (key === 'matrix' && Array.isArray(value)) {
        if (oldTransform) {
          const oldMatrix = oldTransform[i]?.matrix;
          if (oldMatrix instanceof AnimatedNode) {
            obj[key] = createOrReuseArrayFromNode(value, oldMatrix);
          } else {
            obj[key] = createOrReuseArrayFromNode(value);
          }
        } else {
          obj[key] = createOrReuseArrayFromNode(value);
        }
      } else {
        obj[key] = value;
      }
    }
    return obj;
  });
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
  const mappedTransform = mapMatrixArrays(
    transform,
    oldNode && oldNode._transform
  );
  const config = sanitizeTransform(mappedTransform);
  if (oldNode && deepEqual(config, oldNode._config)) {
    return oldNode;
  }
  return new AnimatedTransform(mappedTransform, config);
}

class AnimatedTransform extends AnimatedNode {
  constructor(transform, config) {
    super(
      { type: 'transform', transform: config },
      extractAnimatedParentNodes(transform)
    );
    this._config = config;
    this._transform = transform;
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
