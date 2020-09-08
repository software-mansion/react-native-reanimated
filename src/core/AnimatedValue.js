import { createAnimatedSet as set } from '../core/AnimatedSet';
import InternalAnimatedValue from './InternalAnimatedValue';
import { Platform } from 'react-native';
import ReanimatedModule from '../ReanimatedModule';
import { val } from '../val';

// Animated value wrapped with extra methods for omit cycle of dependencies
export default class AnimatedValue extends InternalAnimatedValue {
  setValue(value) {
    this.__detachAnimation(this._animation);
    if (
      Platform.OS === 'web' ||
      Platform.OS === 'windows' ||
      Platform.OS === 'macos'
    ) {
      this._updateValue(val(value));
    } else {
      if (ReanimatedModule.setValue && typeof value === 'number') {
        // FIXME Remove it after some time
        // For OTA-safety
        // FIXME handle setting value with a node
        ReanimatedModule.setValue(this.__nodeID, value);
      } else {
        const { evaluateOnce } = require('../derived/evaluateOnce');
        evaluateOnce(set(this, value), this);
      }
    }
  }

  toString() {
    return `AnimatedValue, id: ${this.__nodeID}`;
  }

  interpolate(config) {
    const { interpolate } = require('../derived/interpolate');
    return interpolate(this, config);
  }
}
