import Animation from './Animation';

import decay from './decay';
import { block, clockRunning, startClock, stopClock, cond } from '../base';
import Clock from '../core/AnimatedClock';
import AnimatedValue from '../core/AnimatedValue';

class SequenceAnimation extends Animation {
  constructor(config) {
    super();
  }

  static getDefaultState() {
    return {
      finished: new AnimatedValue(0),
    };
  }
}

export default SequenceAnimation;
