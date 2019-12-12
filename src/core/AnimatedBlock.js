import AnimatedNode from './AnimatedNode';
import { val } from '../val';
import InternalAnimatedValue from './InternalAnimatedValue';

class AnimatedBlock extends AnimatedNode {
  _array;

  constructor(array) {
    super({ type: 'block', block: array.map(n => n.__nodeID) }, array);
    this._array = array;
  }

  __onEvaluate() {
    let result;
    this._array.forEach(node => {
      result = val(node);
    });
    return result;
  }
}

export function createAnimatedBlock(items) {
  return adapt(items);
}

function nodify(v) {
  if (typeof v === 'object' && v.__isProxy) {
    if (!v.__val) {
      v.__val = new InternalAnimatedValue(0);
    }
    return v.__val;
  }
  // TODO: cache some typical static values (e.g. 0, 1, -1)
  return v instanceof AnimatedNode
    ? v
    : InternalAnimatedValue.valueForConstant(v);
}

export function adapt(v) {
  return Array.isArray(v)
    ? new AnimatedBlock(v.map(node => adapt(node)))
    : nodify(v);
}
