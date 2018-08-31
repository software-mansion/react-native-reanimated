import AnimatedNode from './AnimatedNode';
import { set } from '../base';
import { val } from '../utils';
import { evaluateOnce } from '../derived/evaluateOnce';
import interpolate from '../derived/interpolate';
import ReanimatedModule from '../ReanimatedModule';
import ReanimatedEventEmitter from '../ReanimatedEventEmitter';

function sanitizeValue(value) {
  return value === null || value === undefined || typeof value === 'string'
    ? value
    : Number(value);
}

const NODE_MAPPING = new Map();

function listener(data) {
  const node = NODE_MAPPING.get(data.id);
  node && node.__detachHelper(data);
}

export default class AnimatedValue extends AnimatedNode {
  constructor(value) {
    super({ type: 'value', value: sanitizeValue(value) });
    this._startingValue = this._value = value;
    this._animation = null;
  }

  __attach() {
    NODE_MAPPING.set(this.__nodeID, this);
    if (NODE_MAPPING.size === 1) {
      ReanimatedEventEmitter.addListener('onValueGet', listener);
    }
    super.__attach();
  }

  __detachHelper = v => {
    NODE_MAPPING.delete(this.__nodeID);
    if (NODE_MAPPING.size === 0) {
      ReanimatedEventEmitter.removeAllListeners('onValueGet');
    }
    this.__nodeConfig.value = v.val;
  };

  __detach() {
    ReanimatedModule.getValue(this.__nodeID);
    this.__detachAnimation(this._animation);
    super.__detach();
  }

  __detachAnimation(animation) {
    animation && animation.__detach();
    if (this._animation === animation) {
      this._animation = null;
    }
  }

  __attachAnimation(animation) {
    this.__detachAnimation(this._animation);
    this._animation = animation;
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
    this.__detachAnimation(this._animation);
    evaluateOnce(set(this, value), this);
  }

  interpolate(config) {
    return interpolate(this, config);
  }
}
