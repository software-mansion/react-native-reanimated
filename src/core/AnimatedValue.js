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
    this._convertToRadians(config);
    return interpolate(this, config);
  }

  // FIXME: Where to put this code???
  _convertToRadians(config) {
    if (typeof config.outputRange[0] == 'string' && config.outputRange[0].includes('deg')) {
      config.outputRange = config.outputRange
        .map(value => Number(value.slice(0, value.indexOf('deg'))))
        .map(value => value * Math.PI / 180)
    }
  }
}
