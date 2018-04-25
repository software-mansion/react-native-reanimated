import AnimatedValue from '../core/AnimatedValue';
import timing from './timing';
import { block, clockRunning, startClock, stopClock, cond } from '../base';
import Clock from '../core/AnimatedClock';
import Easing from '../Easing';

import Animation from './Animation';

const easeInOut = Easing.inOut(Easing.ease);

export default class TimingAnimation extends Animation {
  _toValue;
  _duration;
  _easing;

  _clock;

  constructor(config) {
    super();
    this._toValue = config.toValue;
    this._easing = config.easing !== undefined ? config.easing : easeInOut;
    this._duration = config.duration !== undefined ? config.duration : 500;
  }

  start(value) {
    this._clock = new Clock();

    const state = {
      finished: new AnimatedValue(0),
      position: value,
      time: new AnimatedValue(0),
      frameTime: new AnimatedValue(0),
    };

    const config = {
      duration: this._duration,
      toValue: this._toValue,
      easing: this._easing,
    };

    return block([
      cond(clockRunning(this._clock), 0, [startClock(this._clock)]),
      timing(this._clock, state, config),
      cond(state.finished, stopClock(this._clock)),
    ]);
  }

  stop() {
    // this._finished && this._finished.setValue(1);
  }
}
