import Animation from './Animation';

import decay from './decay';
import { block, clockRunning, startClock, stopClock, cond } from '../base';
import Clock from '../core/AnimatedClock';
import AnimatedValue from '../core/AnimatedValue';

class DecayAnimation extends Animation {
  constructor(config) {
    super();
    this._deceleration =
      config.deceleration !== undefined ? config.deceleration : 0.998;
    this._velocity = config.velocity;
  }

  start(value) {
    this._clock = new Clock();
    const state = {
      finished: new AnimatedValue(0),
      velocity: new AnimatedValue(this._velocity),
      position: value,
      time: new AnimatedValue(0),
    };

    const config = {
      deceleration: this._deceleration,
    };

    return block([
      cond(clockRunning(this._clock), 0, [startClock(this._clock)]),
      decay(this._clock, state, config),
      cond(state.finished, stopClock(this._clock)),
    ]);
  }

  stop() {
    // not implemented yet
  }
  static getDefaultState() {
    return {
      position: new AnimatedValue(0),
      finished: new AnimatedValue(0),
      time: new AnimatedValue(0),
      velocity: new AnimatedValue(0),
    };
  }
}

export default DecayAnimation;
