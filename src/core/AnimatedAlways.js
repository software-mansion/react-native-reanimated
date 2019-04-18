import AnimatedNode from './AnimatedNode';

export default class AnimatedAlways extends AnimatedNode {
  _what;

  constructor(what) {
    if (!(what instanceof AnimatedNode)) {
      throw new Error(
        `Animated.always parameter should be of type AnimatedNode but got ${typeof what}`
      );
    }
    super({ type: 'always', what: what.__nodeID }, [what]);
    this._what = what;
  }

  __onEvaluate() {
    return 0;
  }
}
