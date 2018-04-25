import AnimatedNode from './AnimatedNode';
import AnimatedClock from './AnimatedClock';
import invariant from 'fbjs/lib/invariant';

export default class AnimatedClockTest extends AnimatedNode {
  _clockNode;

  constructor(clockNode) {
    super({ type: 'clockTest', clock: clockNode.__nodeID });
    invariant(
      clockNode instanceof AnimatedClock,
      'Node is not of an AnimatedClock type'
    );
    this._clockNode = clockNode;
  }

  __onEvaluate() {
    return this._clockNode.isStarted() ? 1 : 0;
  }
}
