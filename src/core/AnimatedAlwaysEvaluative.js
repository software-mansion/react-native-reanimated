import AnimatedNode from './AnimatedNode';

export default class AnimatedAlwaysEvaluative extends AnimatedNode {
  _what;

  constructor(what) {
    super({ type: 'alwaysEvaluative', what: what.__nodeID }, [what]);
    this._what = what;
  }

  __onEvaluate() {
    return 0;
  }
}
