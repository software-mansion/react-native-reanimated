import AnimatedNode from './AnimatedNode';

export default class AnimatedAlways extends AnimatedNode {
  _what;

  constructor(what) {
    super({ type: 'always', what: what.__nodeID }, [what]);
    this._what = what;
  }

  __onEvaluate() {
    return 0;
  }
}
