import AnimatedNode from './AnimatedNode';
import { val } from '../val';

class AnimatedAlways extends AnimatedNode {
  _what;

  constructor(what) {
    super({ type: 'always', what: what.__nodeID }, [what]);
    this._what = what;
  }

  update() {
    this.__getValue();
  }

  __onEvaluate() {
    val(this._what);
    return 0;
  }

  __source() {
    return this._what;
  }
}

export function createAnimatedAlways(item) {
  return new AnimatedAlways(item);
}
