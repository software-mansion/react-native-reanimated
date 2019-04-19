import AnimatedNode from './AnimatedNode';
import AnimatedClock from './AnimatedClock';
import invariant from 'fbjs/lib/invariant';

export default class AnimatedStartClock extends AnimatedNode {
  _clockNode;

  constructor(clockNode) {
    super({ type: 'clockStart', clock: clockNode.__nodeID });
    invariant(
      clockNode instanceof AnimatedClock,
      'Reanimated: Animated.startClock argument should be of type AnimatedClock. NodeID: %s',
      clockNode.__nodeID
    );
    this._clockNode = clockNode;
  }

  __onEvaluate() {
    this._clockNode.start();
    return 0;
  }
}
