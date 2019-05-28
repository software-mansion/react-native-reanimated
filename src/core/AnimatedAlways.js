import AnimatedNode from './AnimatedNode';
import invariant from 'fbjs/lib/invariant';

class AnimatedAlways extends AnimatedNode {
  _what;

  constructor(what) {
    invariant(
      what instanceof AnimatedNode,
      `Reanimated: Animated.always node argument should be of type AnimatedNode but got ${what}`
    );
    super({ type: 'always', what: what.__nodeID }, [what]);
    this._what = what;
  }

  toString() {
    return `AnimatedAlways, id: ${this.__nodeID}`;
  }

  __onEvaluate() {
    return 0;
  }
}

export function createAnimatedAlways(item) {
  return new AnimatedAlways(item);
}
