/* global _WORKLET */
import { Easing } from './Easing';

let IN_STYLE_UPDATER = false;

const assertNumber = (value, callerName) => {
  const valueType = typeof value;
  if (valueType !== 'number') {
    let error = `invalid type of toValue passed to ${callerName}, expected \`number\`, got \`${valueType}\``;
    if (valueType === 'object') {
      error += ', maybe you forgot to add `.value`?';
    }
    throw new Error(error);
  }
};

export function initialUpdaterRun(updater) {
  IN_STYLE_UPDATER = true;
  const result = updater();
  IN_STYLE_UPDATER = false;
  return result;
}

function defineAnimation(starting, factory) {
  'worklet';
  if (IN_STYLE_UPDATER) {
    return starting;
  }
  if (_WORKLET) {
    return factory();
  }
  return factory;
}

export function cancelAnimation(sharedValue) {
  'worklet';
  // setting the current value cancels the animation if one is currently running
  sharedValue.value = sharedValue.value; // eslint-disable-line no-self-assign
}

export function withTiming(toValue, userConfig, callback) {
  'worklet';
  // check toValue
  assertNumber(toValue, 'withTiming');

  return defineAnimation(toValue, () => {
    'worklet';
    const config = {
      duration: 300,
      easing: Easing.inOut(Easing.quad),
    };
    if (userConfig) {
      Object.keys(userConfig).forEach((key) => (config[key] = userConfig[key]));
    }

    function timing(animation, now) {
      const { toValue, progress, startTime, current } = animation;

      const runtime = now - startTime;

      if (runtime >= config.duration) {
        // reset startTime to avoid reusing finished animation config in `start` method
        animation.startTime = 0;
        animation.current = toValue;
        return true;
      }

      const newProgress = config.easing(runtime / config.duration);

      const dist =
        ((toValue - current) * (newProgress - progress)) / (1 - progress);
      animation.current += dist;
      animation.progress = newProgress;
      return false;
    }

    function start(animation, value, now, previousAnimation) {
      if (
        previousAnimation &&
        previousAnimation.type === 'timing' &&
        previousAnimation.toValue === toValue &&
        previousAnimation.startTime
      ) {
        // to maintain continuity of timing animations we check if we are starting
        // new timing over the old one with the same parameters. If so, we want
        // to copy animation timeline properties
        animation.startTime = previousAnimation.startTime;
        animation.progress = previousAnimation.progress;
      } else {
        animation.startTime = now;
        animation.progress = 0;
      }
      animation.current = value;
    }

    return {
      type: 'timing',
      animation: timing,
      start,
      progress: 0,
      toValue,
      current: toValue,
      callback,
    };
  });
}

export function withSpring(toValue, userConfig, callback) {
  'worklet';
  // check toValue
  assertNumber(toValue, 'withSpring');

  return defineAnimation(toValue, () => {
    'worklet';

    // TODO: figure out why we can't use spread or Object.assign here
    // when user config is "frozen object" we can't enumerate it (perhaps
    // something is wrong with the object prototype).
    const config = {
      damping: 10,
      mass: 1,
      stiffness: 100,
      overshootClamping: false,
      restDisplacementThreshold: 0.001,
      restSpeedThreshold: 0.001,
    };
    if (userConfig) {
      Object.keys(userConfig).forEach((key) => (config[key] = userConfig[key]));
    }

    function spring(animation, now) {
      const { toValue, lastTimestamp, current, velocity } = animation;

      const deltaTime = Math.min(now - lastTimestamp, 64);
      animation.lastTimestamp = now;

      const c = config.damping;
      const m = config.mass;
      const k = config.stiffness;

      const v0 = -velocity;
      const x0 = toValue - current;

      const zeta = c / (2 * Math.sqrt(k * m)); // damping ratio
      const omega0 = Math.sqrt(k / m); // undamped angular frequency of the oscillator (rad/ms)
      const omega1 = omega0 * Math.sqrt(1 - zeta ** 2); // exponential decay

      const t = deltaTime / 1000;

      const sin1 = Math.sin(omega1 * t);
      const cos1 = Math.cos(omega1 * t);

      // under damped
      const underDampedEnvelope = Math.exp(-zeta * omega0 * t);
      const underDampedFrag1 =
        underDampedEnvelope *
        (sin1 * ((v0 + zeta * omega0 * x0) / omega1) + x0 * cos1);

      const underDampedPosition = toValue - underDampedFrag1;
      // This looks crazy -- it's actually just the derivative of the oscillation function
      const underDampedVelocity =
        zeta * omega0 * underDampedFrag1 -
        underDampedEnvelope *
          (cos1 * (v0 + zeta * omega0 * x0) - omega1 * x0 * sin1);

      // critically damped
      const criticallyDampedEnvelope = Math.exp(-omega0 * t);
      const criticallyDampedPosition =
        toValue - criticallyDampedEnvelope * (x0 + (v0 + omega0 * x0) * t);

      const criticallyDampedVelocity =
        criticallyDampedEnvelope *
        (v0 * (t * omega0 - 1) + t * x0 * omega0 * omega0);

      const isOvershooting = () => {
        if (config.overshootClamping && config.stiffness !== 0) {
          return current < toValue
            ? animation.current > toValue
            : animation.current < toValue;
        } else {
          return false;
        }
      };

      const isVelocity = Math.abs(velocity) < config.restSpeedThreshold;
      const isDisplacement =
        config.stiffness === 0 ||
        Math.abs(toValue - current) < config.restDisplacementThreshold;

      if (zeta < 1) {
        animation.current = underDampedPosition;
        animation.velocity = underDampedVelocity;
      } else {
        animation.current = criticallyDampedPosition;
        animation.velocity = criticallyDampedVelocity;
      }

      if (isOvershooting() || (isVelocity && isDisplacement)) {
        if (config.stiffness !== 0) {
          animation.velocity = 0;
          animation.current = toValue;
        }
        return true;
      }
    }

    function start(animation, value, now, previousAnimation) {
      animation.current = value;
      if (previousAnimation) {
        animation.velocity =
          previousAnimation.velocity || animation.velocity || 0;
        animation.lastTimestamp = previousAnimation.lastTimestamp || now;
      } else {
        animation.lastTimestamp = now;
      }
    }

    return {
      animation: spring,
      start,
      toValue,
      velocity: config.velocity || 0,
      current: toValue,
      callback,
    };
  });
}

export function withDecay(userConfig, callback) {
  'worklet';
  return defineAnimation(0, () => {
    'worklet';
    const config = {
      deceleration: 0.998,
    };
    if (userConfig) {
      Object.keys(userConfig).forEach((key) => (config[key] = userConfig[key]));
    }

    const VELOCITY_EPS = 5;

    function decay(animation, now) {
      const { lastTimestamp, initialVelocity, current, velocity } = animation;

      const deltaTime = Math.min(now - lastTimestamp, 64);
      animation.lastTimestamp = now;

      const kv = Math.pow(config.deceleration, deltaTime);
      const kx = (config.deceleration * (1 - kv)) / (1 - config.deceleration);

      const v0 = velocity / 1000;
      const v = v0 * kv * 1000;
      const x = current + v0 * kx;

      animation.current = x;
      animation.velocity = v;

      let toValueIsReached = null;

      if (Array.isArray(config.clamp)) {
        if (initialVelocity < 0 && animation.current <= config.clamp[0]) {
          toValueIsReached = config.clamp[0];
        } else if (
          initialVelocity > 0 &&
          animation.current >= config.clamp[1]
        ) {
          toValueIsReached = config.clamp[1];
        }
      }

      if (Math.abs(v) < VELOCITY_EPS || toValueIsReached !== null) {
        if (toValueIsReached !== null) {
          animation.current = toValueIsReached;
        }

        return true;
      }
    }

    function start(animation, value, now) {
      animation.current = value;
      animation.lastTimestamp = now;
      animation.initialVelocity = config.velocity;
    }

    return {
      animation: decay,
      start,
      velocity: config.velocity || 0,
      callback,
    };
  });
}

export function delay(delayMs, _nextAnimation) {
  'worklet';
  return defineAnimation(_nextAnimation, () => {
    'worklet';

    const nextAnimation =
      typeof _nextAnimation === 'function' ? _nextAnimation() : _nextAnimation;

    function delay(animation, now) {
      const { startTime, started, previousAnimation } = animation;

      if (now - startTime > delayMs) {
        if (!started) {
          nextAnimation.start(
            nextAnimation,
            animation.current,
            now,
            previousAnimation
          );
          animation.previousAnimation = null;
          animation.started = true;
        }
        const finished = nextAnimation.animation(nextAnimation, now);
        animation.current = nextAnimation.current;
        return finished;
      } else if (previousAnimation) {
        const finished = previousAnimation.animation(previousAnimation, now);
        animation.current = previousAnimation.current;
        if (finished) {
          animation.previousAnimation = null;
        }
      }
      return false;
    }

    function start(animation, value, now, previousAnimation) {
      animation.startTime = now;
      animation.started = false;
      animation.current = value;
      animation.previousAnimation = previousAnimation;
    }

    const callback = (finished) => {
      nextAnimation.callback(finished);
    };

    return {
      animation: delay,
      start,
      current: nextAnimation.current,
      callback,
    };
  });
}

export function sequence(..._animations) {
  'worklet';
  return defineAnimation(_animations[0], () => {
    'worklet';
    const animations = _animations.map((a) => {
      const result = typeof a === 'function' ? a() : a;
      result.finished = false;
      return result;
    });
    const firstAnimation = animations[0];

    const callback = (finished) => {
      if (finished) {
        // we want to call the callback after every single animation
        // not after all of them
        return;
      }
      // this is going to be called only if sequence has been cancelled
      animations.forEach((animation) => {
        if (typeof animation.callback === 'function' && !animation.finished) {
          animation.callback(finished);
        }
      });
    };

    function sequence(animation, now) {
      const currentAnim = animations[animation.animationIndex];
      const finished = currentAnim.animation(currentAnim, now);
      animation.current = currentAnim.current;
      if (finished) {
        // we want to call the callback after every single animation
        currentAnim.callback(true /* finished */);
        currentAnim.finished = true;
        animation.animationIndex += 1;
        if (animation.animationIndex < animations.length) {
          const nextAnim = animations[animation.animationIndex];
          nextAnim.start(nextAnim, currentAnim.current, now, currentAnim);
          return false;
        }
        return true;
      }
      return false;
    }

    function start(animation, value, now, previousAnimation) {
      animation.animationIndex = 0;
      firstAnimation.start(firstAnimation, value, now, previousAnimation);
    }

    return {
      animation: sequence,
      start,
      animationIndex: 0,
      current: firstAnimation.current,
      callback,
    };
  });
}

export function repeat(_nextAnimation, numberOfReps = 2, reverse = false, callback = () => {}) {
  'worklet';
  return defineAnimation(_nextAnimation, () => {
    'worklet';

    const nextAnimation =
      typeof _nextAnimation === 'function' ? _nextAnimation() : _nextAnimation;

    function repeat(animation, now) {
      const finished = nextAnimation.animation(nextAnimation, now);
      animation.current = nextAnimation.current;
      if (finished) {
        animation.reps += 1;
        callback(animation.current);
        if (numberOfReps > 0 && animation.reps >= numberOfReps) {
          return true;
        }

        const startValue = reverse
          ? nextAnimation.current
          : animation.startValue;
        if (reverse) {
          nextAnimation.toValue = animation.startValue;
          animation.startValue = startValue;
        }
        nextAnimation.start(nextAnimation, startValue, now, nextAnimation);
        return false;
      }
      return false;
    }

    function start(animation, value, now, previousAnimation) {
      animation.startValue = value;
      animation.reps = 0;
      nextAnimation.start(nextAnimation, value, now, previousAnimation);
    }

    return {
      animation: repeat,
      start,
      reps: 0,
      current: nextAnimation.current,
    };
  });
}

/* Deprecated, kept for backward compatibility. Will be removed soon */
export function loop(nextAnimation, numberOfLoops = 1) {
  'worklet';
  console.warn('Method `loop` is deprecated. Please use `repeat` instead');
  return repeat(nextAnimation, Math.round(numberOfLoops * 2), true);
}
