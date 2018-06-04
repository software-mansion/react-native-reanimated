import AnimatedNode from './AnimatedNode';
import { val } from '../utils';

function sanitizeValue(value) {
  return value === null || value === undefined ? value : Number(value);
}

export default class AnimatedValue extends AnimatedNode {
  constructor(what, value) {
    super({
      type: 'dummyFinal',
      value: sanitizeValue(value),
      what: what.__nodeID,
    });
  }

  __onEvaluate() {
    if (this.__inputNodes && this.__inputNodes.length) {
      this.__inputNodes.forEach(val);
    }
    return 0;
  }

  _updateValue(value) {}
}
