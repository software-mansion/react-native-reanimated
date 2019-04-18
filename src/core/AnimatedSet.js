import AnimatedNode from './AnimatedNode';
import { val } from '../utils';

export default class AnimatedSet extends AnimatedNode {
  _what;
  _value;

  constructor(what, value) {
    if (!(what instanceof AnimatedNode)) {
      throw new Error(
        `Animated.set target should be of type AnimatedNode but got ${typeof what}`
      );
    }
    super({ type: 'set', what: what.__nodeID, value: value.__nodeID }, [value]);
    this._what = what;
    this._value = value;
  }

  __onEvaluate() {
    const newValue = val(this._value);
    this._what._updateValue(newValue);
    return newValue;
  }
}
