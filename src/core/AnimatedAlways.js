import AnimatedNode from './AnimatedNode';
import invariant from 'fbjs/lib/invariant';

export default class AnimatedAlways extends AnimatedNode {
  _what;

  constructor(what) {
    super({ type: 'always', what: what.__nodeID }, [what]);
    invariant(
      what instanceof AnimatedNode,
      'Reanimated: Animated.always node argument should be of type AnimatedNode but got %s. NodeID: %s',
      typeof what,
      what.__nodeID
    );
    this._what = what;
  }

  __onEvaluate() {
    return 0;
  }
}
