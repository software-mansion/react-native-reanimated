import AnimatedNode from './AnimatedNode';
import AnimatedClock from './AnimatedClock';
import invariant from 'fbjs/lib/invariant';

class AnimatedStartClock extends AnimatedNode {
  _clockNode;

  constructor(clockNode) {
    super({ type: 'clockStart', clock: clockNode.__nodeID });
    invariant(
      clockNode instanceof AnimatedClock,
      `Reanimated: Animated.startClock argument should be of type AnimatedClock but got ${clockNode}`
    );
    this._clockNode = clockNode;
  }

  toString() {
    return `AnimatedStartClock, id: ${this.__nodeID}`;
  }

  __onEvaluate() {
    this._clockNode.start();
    return 0;
  }
}

export function createAnimatedStartClock(clock) {
  return new AnimatedStartClock(clock);
}
