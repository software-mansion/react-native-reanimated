import AnimatedNode from './AnimatedNode';
import { val } from '../val';
import ReanimatedModule from '../ReanimatedModule';

function sanitizeValue(value) {
  return value === null || value === undefined || typeof value === 'string'
    ? value
    : Number(value);
}

/**
 * This class has been made internal in order to omit dependencies' cycles which
 * were caused by imperative setValue and interpolate – they are currently exposed with AnimatedValue.js
 */
export default class InternalAnimatedValue extends AnimatedNode {
  constructor(value) {
    super({ type: 'value', value: sanitizeValue(value) });
    this._startingValue = this._value = value;
    this._animation = null;
  }

  __detach() {
    ReanimatedModule.getValue(
      this.__nodeID,
      val => (this.__nodeConfig.value = val)
    );
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
}
