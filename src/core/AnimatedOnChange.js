import AnimatedNode from './AnimatedNode';
import { val } from '../utils';

export default class AnimatedOnChange extends AnimatedNode {
  _value;
  _what;
  _lastValue = null;

  constructor(value, what) {
    super({ type: 'onChange', what: what.__nodeID, value: value.__nodeID }, [
      value,
    ]);
    this._value = value;
    this._what = what;
    this._lastValue = val(value);
  }

  update() {
    // side effects
    val(this);
  }

  __onEvaluate() {
    const newValue = val(this._value);
    if (newValue !== this._lastValue) {
      val(this._what);
      this._lastValue = newValue;
    }
  }
}
