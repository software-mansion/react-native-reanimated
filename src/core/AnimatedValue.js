import { createAnimatedSet as set } from '../core/AnimatedSet';
import interpolate from '../derived/interpolate';
import InternalAnimatedValue from './InternalAnimatedValue';
import { evaluateOnce } from '../derived/evaluateOnce';

// Animated value wrapped with extra methods for omit cycle of dependencies
export default class AnimatedValue extends InternalAnimatedValue {
  setValue(value) {
    this.__detachAnimation(this._animation);
    evaluateOnce(set(this, value), this);
  }

  interpolate(config) {
    _convertToRadians(config);
    return interpolate(this, config);
  }

  // FIXME: Where to put this code???
  _convertToRadians(config) {
    if (typeof config.outputRange[0] == 'string' && config.outputRange.some(v => v.includes('deg'))) {
      config.outputRange = config.outputRange
        .map(v => v.slice(0, v.indexOf('deg')))
        .map(Number)
        .map(v => v * Math.PI / 180)
    }
  }
}
