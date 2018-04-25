import AnimatedNode from './AnimatedNode';

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

export default class AnimatedTransform extends AnimatedNode {
  constructor(transform) {
    super(
      { type: 'transform', transform: sanitizeTransform(transform) },
      extractAnimatedParentNodes(transform)
    );
    this._transform = transform;
  }

  __getProps() {
    return this._transform.map(transform => {
      const result = {};
      for (const key in transform) {
        const value = transform[key];
        if (value instanceof AnimatedNode) {
          result[key] = value.__getProps();
        } else {
          result[key] = value;
        }
      }
      return result;
    });
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
