import { createAnimatedSet as set } from '../core/AnimatedSet';
import interpolate from '../derived/interpolate';
import InternalAnimatedValue from './InternalAnimatedValue';
import { evaluateOnce } from '../derived/evaluateOnce';

export default class AnimatedValue extends InternalAnimatedValue {
  setValue(value) {
    this.__detachAnimation(this._animation);
    evaluateOnce(set(this, value), this);
  }

  interpolate(config) {
    return interpolate(this, config);
  }
}
