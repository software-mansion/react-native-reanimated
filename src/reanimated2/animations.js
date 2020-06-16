/* global _WORKLET */
import { Easing } from './Easing';

export function cancelAnimation(value) {
  'worklet';
  // TODO: this is supported only when run on UI – maybe assert?
  const previousAnimation = value._animation;
  if (previousAnimation) {
    previousAnimation.cancelled = true;
    value._animation = null;
  }
}

export function withTiming(toValue, userConfig, callback) {
  'worklet';
  if (!_WORKLET) {
    return toValue;
  }

  const config = {
    duration: 300,
    easing: Easing.inOut(Easing.quad),
  };
  if (userConfig) {
    Object.keys(userConfig).forEach(key => (config[key] = userConfig[key]));
  }

  function timing(animation, now) {
    const { toValue, progress, startTime, current } = animation;

    const runtime = now - startTime;

    if (runtime >= config.duration) {
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
    animation.startTime = now;
    animation.progress = 0;
    animation.current = value;
  }

  return {
    animation: timing,
    start,
    progress: 0,
    toValue,
    current: toValue,
    callback,
  };
}

export function withSpring(toValue, userConfig, callback) {
  'worklet';
  if (!_WORKLET) {
    return toValue;
  }

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
    Object.keys(userConfig).forEach(key => (config[key] = userConfig[key]));
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
        return current < toValue ? current > toValue : current < toValue;
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
      animation.velocity = previousAnimation.velocity || animation.velocity || 0;
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
}

export function delay(delayMs, nextAnimation) {
  'worklet';
  if (!_WORKLET) {
    return nextAnimation;
  }

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

  return {
    animation: delay,
    start,
    current: nextAnimation.current,
  };
}

export function loop(nextAnimation, numberOfLoops) {
  'worklet';
  if (!_WORKLET) {
    return nextAnimation;
  }
  if (numberOfLoops === undefined) {
    // todo: default values for worklet params does not work (perhaps issue with plugin)
    numberOfLoops = 1;
  }

  function loop(animation, now) {
    const finished = nextAnimation.animation(nextAnimation, now);
    animation.current = nextAnimation.current;
    if (finished) {
      const finalValue = nextAnimation.current;
      nextAnimation.toValue = animation.startValue;
      nextAnimation.start(nextAnimation, finalValue, now, nextAnimation);
      animation.startValue = finalValue;
      animation.loops += 1;
      return (
        numberOfLoops > 0 && animation.loops >= Math.round(numberOfLoops * 2)
      );
    }
    return false;
  }

  function start(animation, value, now, previousAnimation) {
    animation.startValue = value;
    animation.loops = 0;
    nextAnimation.start(nextAnimation, value, now, previousAnimation);
  }

  return {
    animation: loop,
    start,
    loops: 0,
    current: nextAnimation.current,
  };
}
