import AnimatedNode from './AnimatedNode';
import invariant from 'fbjs/lib/invariant';

export default class AnimatedAlways extends AnimatedNode {
  _what;

  constructor(what) {
    invariant(
      what instanceof AnimatedNode,
      `Animated.set target should be of type AnimatedNode but got ${typeof what}`
    );
    super({ type: 'always', what: what.__nodeID }, [what]);
    this._what = what;
  }

  __onEvaluate() {
    return 0;
  }
}
