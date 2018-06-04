import AnimatedNode from './AnimatedNode';
import { val } from '../utils';

export default class AnimatedDummyFinal extends AnimatedNode {
  _what;

  constructor(what) {
    super({ type: 'dummyFinal', what: what.__nodeID }, [what]);
    this._what = what;
  }

  __onEvaluate() {
    return 0;
  }
}
