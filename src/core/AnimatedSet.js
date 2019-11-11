import AnimatedNode from './AnimatedNode';
import { val } from '../val';
import { adapt } from '../core/AnimatedBlock';

import invariant from 'fbjs/lib/invariant';

class AnimatedSet extends AnimatedNode {
  _what;
  _value;

  constructor(what, value) {
    super({ type: 'set', what: what.__nodeID, value: value.__nodeID }, [value]);
    invariant(!what._constant, 'Value to be set cannot be constant');
    this._what = what;
    this._value = value;
  }

  __onEvaluate() {
    const newValue = val(this._value);
    this._what._updateValue(newValue);
    return newValue;
  }
}

export function createAnimatedSet(what, value) {
  return new AnimatedSet(what, adapt(value));
}
