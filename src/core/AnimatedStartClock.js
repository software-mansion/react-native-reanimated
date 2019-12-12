import AnimatedNode from './AnimatedNode';
import AnimatedClock from './AnimatedClock';
import invariant from 'fbjs/lib/invariant';

class AnimatedStartClock extends AnimatedNode {
  _clockNode;

  constructor(clockNode) {
    super({ type: 'clockStart', clock: clockNode.__nodeID });
    invariant(
      clockNode instanceof AnimatedClock,
      'Node is not of an AnimatedClock type'
    );
    this._clockNode = clockNode;
  }

  __onEvaluate() {
    this._clockNode.start();
    return 0;
  }
}

export function createAnimatedStartClock(clock) {
  return new AnimatedStartClock(clock);
}
