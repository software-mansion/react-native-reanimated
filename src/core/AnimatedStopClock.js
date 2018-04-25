import AnimatedNode from './AnimatedNode';
import AnimatedClock from './AnimatedClock';
import invariant from 'fbjs/lib/invariant';

export default class AnimatedStopClock extends AnimatedNode {
  _clockNode;

  constructor(clockNode) {
    super({ type: 'clockStop', clock: clockNode.__nodeID });
    invariant(
      clockNode instanceof AnimatedClock,
      'Node is not of an AnimatedClock type'
    );
    this._clockNode = clockNode;
  }

  __onEvaluate() {
    this._clockNode.stop();
    return 0;
  }
}
