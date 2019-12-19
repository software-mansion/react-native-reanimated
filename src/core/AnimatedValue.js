import interpolate from '../derived/interpolate';
import InternalAnimatedValue from './InternalAnimatedValue';
import { Platform } from 'react-native';
import  ReanimatedModule from '../ReanimatedModule';

// Animated value wrapped with extra methods for omit cycle of dependencies
export default class AnimatedValue extends InternalAnimatedValue {
  setValue(value) {
    this.__detachAnimation(this._animation);
    if (Platform.OS === 'web') {
      this._updateValue(value);
    } else {
      ReanimatedModule.setValue(this.__nodeID, value);
    }
  }
  
  toString() {
    return `AnimatedValue, id: ${super.__nodeID}`;
  }

  interpolate(config) {
    return interpolate(this, config);
  }
}
