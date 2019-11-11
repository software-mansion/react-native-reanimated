import AnimatedValue from '../core/InternalAnimatedValue';
import Animation from './Animation';
import SpringConfig from '../SpringConfig';
import spring from './spring';

import { block, clockRunning, startClock, stopClock, cond } from '../base';
import Clock from '../core/AnimatedClock';

import invariant from 'fbjs/lib/invariant';

function withDefault(value, defaultValue) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  return value;
}

export default class SpringAnimation extends Animation {
  constructor(config) {
    super();

    this._overshootClamping = withDefault(config.overshootClamping, false);
    this._restDisplacementThreshold = withDefault(
      config.restDisplacementThreshold,
      0.001
    );
    this._restSpeedThreshold = withDefault(config.restSpeedThreshold, 0.001);
    this._initialVelocity = withDefault(config.velocity, 0);
    this._lastVelocity = withDefault(config.velocity, 0);
    this._toValue = config.toValue;
    this._delay = withDefault(config.delay, 0);

    if (
      config.stiffness !== undefined ||
      config.damping !== undefined ||
      config.mass !== undefined
    ) {
      invariant(
        config.bounciness === undefined &&
          config.speed === undefined &&
          config.tension === undefined &&
          config.friction === undefined,
        'You can define one of bounciness/speed, tension/friction, or stiffness/damping/mass, but not more than one'
      );
      this._stiffness = withDefault(config.stiffness, 100);
      this._damping = withDefault(config.damping, 10);
      this._mass = withDefault(config.mass, 1);
    } else if (config.bounciness !== undefined || config.speed !== undefined) {
      // Convert the origami bounciness/speed values to stiffness/damping
      // We assume mass is 1.
      invariant(
        config.tension === undefined &&
          config.friction === undefined &&
          config.stiffness === undefined &&
          config.damping === undefined &&
          config.mass === undefined,
        'You can define one of bounciness/speed, tension/friction, or stiffness/damping/mass, but not more than one'
      );
      const springConfig = SpringConfig.fromBouncinessAndSpeed(
        withDefault(config.bounciness, 8),
        withDefault(config.speed, 12)
      );
      this._stiffness = springConfig.stiffness;
      this._damping = springConfig.damping;
      this._mass = 1;
    } else {
      // Convert the origami tension/friction values to stiffness/damping
      // We assume mass is 1.
      const springConfig = SpringConfig.fromOrigamiTensionAndFriction(
        withDefault(config.tension, 40),
        withDefault(config.friction, 7)
      );
      this._stiffness = springConfig.stiffness;
      this._damping = springConfig.damping;
      this._mass = 1;
    }

    invariant(this._stiffness > 0, 'Stiffness value must be greater than 0');
    invariant(this._damping > 0, 'Damping value must be greater than 0');
    invariant(this._mass > 0, 'Mass value must be greater than 0');
  }

  start(value) {
    this._clock = new Clock();
    const state = {
      finished: new AnimatedValue(0),
      velocity: new AnimatedValue(this._initialVelocity),
      position: value,
      time: new AnimatedValue(0),
    };

    const config = {
      damping: this._damping,
      mass: this._mass,
      stiffness: this._stiffness,
      toValue: this._toValue,
      overshootClamping: this._overshootClamping,
      restSpeedThreshold: this._restSpeedThreshold,
      restDisplacementThreshold: this._restDisplacementThreshold,
    };

    return block([
      cond(clockRunning(this._clock), 0, [startClock(this._clock)]),
      spring(this._clock, state, config),
      cond(state.finished, stopClock(this._clock)),
    ]);
  }

  stop() {
    // this._finished && this._finished.setValue(1);
  }

  static getDefaultState() {
    return {
      position: new AnimatedValue(0),
      finished: new AnimatedValue(0),
      velocity: new AnimatedValue(0),
      time: new AnimatedValue(0),
    };
  }
}
