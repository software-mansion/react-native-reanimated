import { createAnimatedSet as set } from '../core/AnimatedSet';
import interpolate from '../derived/interpolate';
import InternalAnimatedValue from './InternalAnimatedValue';
import { evaluateOnce } from '../derived/evaluateOnce';
import { Platform } from 'react-native';

// Animated value wrapped with extra methods for omit cycle of dependencies
export default class AnimatedValue extends InternalAnimatedValue {
  setValue(value) {
    this.__detachAnimation(this._animation);
    if (Platform.OS === 'web') {
      this._updateValue(value);
    } else {
      evaluateOnce(set(this, value), this);
    }
  }

  interpolate(config) {
    return interpolate(this, config);
  }
}
