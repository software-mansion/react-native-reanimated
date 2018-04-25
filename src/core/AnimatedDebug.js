import { val } from '../utils';
import AnimatedNode from './AnimatedNode';

export default class AnimatedDebug extends AnimatedNode {
  _message;
  _value;

  constructor(message, value) {
    super({ type: 'debug', message, value: value.__nodeID }, [value]);
    this._message = message;
    this._value = value;
  }

  __onEvaluate() {
    const value = val(this._value);
    console.log(this._message, value);
    return value;
  }
}
