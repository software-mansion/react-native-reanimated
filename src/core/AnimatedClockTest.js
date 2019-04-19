import AnimatedNode from './AnimatedNode';
import AnimatedClock from './AnimatedClock';
import invariant from 'fbjs/lib/invariant';

export default class AnimatedClockTest extends AnimatedNode {
  _clockNode;

  constructor(clockNode) {
    super({ type: 'clockTest', clock: clockNode.__nodeID });
    invariant(
      clockNode instanceof AnimatedClock,
      'Reanimated: Animated.clockRunning argument should be of type AnimatedClock but got %s, NodeID: %s',
      typeof clockNode,
      clockNode.__nodeID
    );
    this._clockNode = clockNode;
  }

  __onEvaluate() {
    return this._clockNode.isStarted() ? 1 : 0;
  }
}
