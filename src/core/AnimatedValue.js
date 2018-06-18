import AnimatedNode from './AnimatedNode';
import { set } from '../base';
import { val } from '../utils';
import interpolate from '../derived/interpolate';
import { evaluateOnce } from '../utils';

function sanitizeValue(value) {
  return value === null || value === undefined ? value : Number(value);
}

export default class AnimatedValue extends AnimatedNode {
  constructor(value) {
    super({ type: 'value', value: sanitizeValue(value) });
    this._startingValue = this._value = value;
    this._animation = null;
  }

  __detach() {
    super.__detach();
  }

  __onEvaluate() {
    if (this.__inputNodes && this.__inputNodes.length) {
      this.__inputNodes.forEach(val);
    }
    return this._value + this._offset;
  }

  _updateValue(value) {
    this._value = value;
    this.__forceUpdateCache(value);
  }

  setValue(value) {
    evaluateOnce(set(this, value), this);
  }

  interpolate(config) {
    return interpolate(this, config);
  }
}
