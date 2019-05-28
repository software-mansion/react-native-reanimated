import AnimatedNode from './AnimatedNode';
import AnimatedClock from './AnimatedClock';
import invariant from 'fbjs/lib/invariant';

class AnimatedClockTest extends AnimatedNode {
  _clockNode;

  constructor(clockNode) {
    invariant(
      clockNode instanceof AnimatedClock,
      `Reanimated: Animated.clockRunning argument should be of type AnimatedClock but got ${clockNode}`
    );
    super({ type: 'clockTest', clock: clockNode.__nodeID });
    this._clockNode = clockNode;
  }

  toString() {
    return `AnimatedClockTest, id: ${this.__nodeID}`;
  }

  __onEvaluate() {
    return this._clockNode.isStarted() ? 1 : 0;
  }
}

export function createAnimatedClockTest(clock) {
  return new AnimatedClockTest(clock);
}
