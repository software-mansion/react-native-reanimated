import { createAnimatedSet as set } from '../core/AnimatedSet';
import interpolate from '../derived/interpolate';
import InternalAnimatedValue from './InternalAnimatedValue';
import { Platform } from 'react-native';
import { evaluateOnce } from '../derived/evaluateOnce';
import ReanimatedModule from '../ReanimatedModule';

// Animated value wrapped with extra methods for omit cycle of dependencies
export default class AnimatedValue extends InternalAnimatedValue {
  setValue(value) {
    this.__detachAnimation(this._animation);
    if (Platform.OS === 'web') {
      this._updateValue(value);
    } else {
      if (ReanimatedModule.setValue && typeof value === "number") {
        // FIXME Remove it after some time
        // For OTA-safety
        // FIXME handle setting value with a node
        ReanimatedModule.setValue(this.__nodeID, value);
      } else {
        evaluateOnce(set(this, value), this);
      }
    }
  }

  toString() {
    return `AnimatedValue, id: ${this.__nodeID}`;
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
