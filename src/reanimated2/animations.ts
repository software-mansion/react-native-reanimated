/* global _WORKLET */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Easing } from './Easing';
import { isColor, convertToHSVA, toRGBA } from './Colors';
import NativeReanimated from './NativeReanimated';
import { Platform } from 'react-native';

let IN_STYLE_UPDATER = false;

export function initialUpdaterRun(updater) {
  IN_STYLE_UPDATER = true;
  const result = updater();
  IN_STYLE_UPDATER = false;
  return result;
}

export function transform(value, handler) {
  'worklet';
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    // toInt
    // TODO handle color
    const match = value.match(/([A-Za-z]*)(-?\d*\.?\d*)([A-Za-z%]*)/);
    const prefix = match[1];
    const suffix = match[3];
    const number = match[2];
    handler.__prefix = prefix;
    handler.__suffix = suffix;
    return parseFloat(number);
  }

  // toString if __prefix is available and number otherwise
  if (handler.__prefix === undefined) {
    return value;
  }

  return handler.__prefix + value + handler.__suffix;
}

export function transformAnimation(animation) {
  'worklet';
  if (!animation) {
    return;
  }
  animation.toValue = transform(animation.toValue, animation);
  animation.current = transform(animation.current, animation);
  animation.startValue = transform(animation.startValue, animation);
}

export function decorateAnimation(animation) {
  'worklet';
  if (animation.isHigherOrder) {
    return;
  }
  const baseOnStart = animation.onStart;
  const baseOnFrame = animation.onFrame;
  const animationCopy = Object.assign({}, animation);
  delete animationCopy.callback;

  const prefNumberSuffOnStart = (
    animation,
    value,
    timestamp,
    previousAnimation
  ) => {
    const val = transform(value, animation);
    transformAnimation(animation);
    if (previousAnimation !== animation) transformAnimation(previousAnimation);

    baseOnStart(animation, val, timestamp, previousAnimation);

    transformAnimation(animation);
    if (previousAnimation !== animation) transformAnimation(previousAnimation);
  };
  const prefNumberSuffOnFrame = (animation, timestamp) => {
    transformAnimation(animation);

    const res = baseOnFrame(animation, timestamp);

    transformAnimation(animation);
    return res;
  };

  const tab = ['H', 'S', 'V', 'A'];
  const colorOnStart = (animation, value, timestamp, previousAnimation) => {
    let HSVAValue;
    let HSVACurrent;
    let HSVAToValue;
    const res = [];
    if (isColor(value)) {
      HSVACurrent = convertToHSVA(animation.current);
      HSVAValue = convertToHSVA(value);
      if (animation.toValue) {
        HSVAToValue = convertToHSVA(animation.toValue);
      }
    }
    tab.forEach((i, index) => {
      animation[i] = Object.assign({}, animationCopy);
      animation[i].current = HSVACurrent[index];
      animation[i].toValue = HSVAToValue ? HSVAToValue[index] : undefined;
      animation[i].onStart(
        animation[i],
        HSVAValue[index],
        timestamp,
        previousAnimation ? previousAnimation[i] : undefined
      );
      res.push(animation[i].current);
    });

    animation.current = toRGBA(res);
  };

  const colorOnFrame = (animation, timestamp) => {
    const HSVACurrent = convertToHSVA(animation.current);
    const res = [];
    let finished = true;
    tab.forEach((i, index) => {
      animation[i].current = HSVACurrent[index];
      finished &= animation[i].onFrame(animation[i], timestamp);
      res.push(animation[i].current);
    });

    animation.current = toRGBA(res);
    return finished;
  };

  animation.onStart = (animation, value, timestamp, previousAnimation) => {
    if (isColor(value)) {
      colorOnStart(animation, value, timestamp, previousAnimation);
      animation.onFrame = colorOnFrame;
      return;
    } else if (typeof value === 'string') {
      prefNumberSuffOnStart(animation, value, timestamp, previousAnimation);
      animation.onFrame = prefNumberSuffOnFrame;
      return;
    }
    baseOnStart(animation, value, timestamp, previousAnimation);
  };
}

export function defineAnimation(starting, factory) {
  'worklet';
  if (IN_STYLE_UPDATER) {
    return starting;
  }
  const create = () => {
    'worklet';
    const animation = factory();
    decorateAnimation(animation);
    return animation;
  };

  if (_WORKLET || !NativeReanimated.native) {
    return create();
  }
  return create;
}

export function cancelAnimation(sharedValue) {
  'worklet';
  // setting the current value cancels the animation if one is currently running
  sharedValue.value = sharedValue.value; // eslint-disable-line no-self-assign
}

export function withTiming(toValue, userConfig, callback) {
  'worklet';

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

    function onStart(animation, value, now, previousAnimation) {
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
      onFrame: timing,
      onStart,
      progress: 0,
      toValue,
      current: toValue,
      callback,
    };
  });
}

export function withSpring(toValue, userConfig, callback) {
  'worklet';

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
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 2,
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

    function onStart(animation, value, now, previousAnimation) {
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
      onFrame: spring,
      onStart,
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
      velocityFactor: Platform.OS !== 'web' ? 1 : 1000,
    };
    if (userConfig) {
      Object.keys(userConfig).forEach((key) => (config[key] = userConfig[key]));
    }

    const VELOCITY_EPS = Platform.OS !== 'web' ? 1 : 1 / 20;
    const SLOPE_FACTOR = 0.1;

    function decay(animation, now) {
      const {
        lastTimestamp,
        startTimestamp,
        initialVelocity,
        current,
        velocity,
      } = animation;

      const deltaTime = Math.min(now - lastTimestamp, 64);
      const v =
        velocity *
        Math.exp(
          -(1 - config.deceleration) * (now - startTimestamp) * SLOPE_FACTOR
        );
      animation.current =
        current + (v * config.velocityFactor * deltaTime) / 1000; // /1000 because time is in ms not in s
      animation.velocity = v;
      animation.lastTimestamp = now;

      if (config.clamp) {
        if (initialVelocity < 0 && animation.current <= config.clamp[0]) {
          animation.current = config.clamp[0];
          return true;
        } else if (
          initialVelocity > 0 &&
          animation.current >= config.clamp[1]
        ) {
          animation.current = config.clamp[1];
          return true;
        }
      }

      if (Math.abs(v) < VELOCITY_EPS) {
        return true;
      }
    }

    function validateConfig() {
      if (config.clamp) {
        if (Array.isArray(config.clamp)) {
          if (config.clamp.length !== 2) {
            console.error(
              `clamp array must contain 2 items but is given ${config.clamp.length}`
            );
          }
        } else {
          console.error(
            `config.clamp must be an array but is ${typeof config.clamp}`
          );
        }
      }
      if (config.velocityFactor <= 0) {
        console.error(
          `config.velocityFactor must be greather then 0 but is ${config.velocityFactor}`
        );
      }
    }

    function onStart(animation, value, now) {
      animation.current = value;
      animation.lastTimestamp = now;
      animation.startTimestamp = now;
      animation.initialVelocity = config.velocity;
      validateConfig();
    }

    return {
      onFrame: decay,
      onStart,
      velocity: config.velocity || 0,
      callback,
    };
  });
}

export function withDelay(delayMs, _nextAnimation) {
  'worklet';
  return defineAnimation(_nextAnimation, () => {
    'worklet';
    const nextAnimation =
      typeof _nextAnimation === 'function' ? _nextAnimation() : _nextAnimation;

    function delay(animation, now) {
      const { startTime, started, previousAnimation } = animation;

      if (now - startTime > delayMs) {
        if (!started) {
          nextAnimation.onStart(
            nextAnimation,
            animation.current,
            now,
            previousAnimation
          );
          animation.previousAnimation = null;
          animation.started = true;
        }
        const finished = nextAnimation.onFrame(nextAnimation, now);
        animation.current = nextAnimation.current;
        return finished;
      } else if (previousAnimation) {
        const finished = previousAnimation.onFrame(previousAnimation, now);
        animation.current = previousAnimation.current;
        if (finished) {
          animation.previousAnimation = null;
        }
      }
      return false;
    }

    function onStart(animation, value, now, previousAnimation) {
      animation.startTime = now;
      animation.started = false;
      animation.current = value;
      animation.previousAnimation = previousAnimation;
    }

    const callback = (finished) => {
      if (nextAnimation.callback) {
        nextAnimation.callback(finished);
      }
    };

    return {
      isHigherOrder: true,
      onFrame: delay,
      onStart,
      current: nextAnimation.current,
      callback,
    };
  });
}

export function withSequence(..._animations) {
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
      const finished = currentAnim.onFrame(currentAnim, now);
      animation.current = currentAnim.current;
      if (finished) {
        // we want to call the callback after every single animation
        if (currentAnim.callback) {
          currentAnim.callback(true /* finished */);
        }
        currentAnim.finished = true;
        animation.animationIndex += 1;
        if (animation.animationIndex < animations.length) {
          const nextAnim = animations[animation.animationIndex];
          nextAnim.onStart(nextAnim, currentAnim.current, now, currentAnim);
          return false;
        }
        return true;
      }
      return false;
    }

    function onStart(animation, value, now, previousAnimation) {
      if (animations.length === 1) {
        throw Error(
          'withSequence() animation require more than one animation as argument'
        );
      }
      animation.animationIndex = 0;
      if (previousAnimation === undefined) {
        previousAnimation = animations[animations.length - 1];
      }
      firstAnimation.onStart(firstAnimation, value, now, previousAnimation);
    }

    return {
      isHigherOrder: true,
      onFrame: sequence,
      onStart,
      animationIndex: 0,
      current: firstAnimation.current,
      callback,
    };
  });
}

export function withRepeat(
  _nextAnimation,
  numberOfReps = 2,
  reverse = false,
  callback
) {
  'worklet';

  return defineAnimation(_nextAnimation, () => {
    'worklet';

    const nextAnimation =
      typeof _nextAnimation === 'function' ? _nextAnimation() : _nextAnimation;

    function repeat(animation, now) {
      const finished = nextAnimation.onFrame(nextAnimation, now);
      animation.current = nextAnimation.current;
      if (finished) {
        animation.reps += 1;
        // call inner animation's callback on every repetition
        // as the second argument the animation's current value is passed
        if (nextAnimation.callback) {
          nextAnimation.callback(true /* finished */, animation.current);
        }
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
        nextAnimation.onStart(
          nextAnimation,
          startValue,
          now,
          nextAnimation.previousAnimation
        );
        return false;
      }
      return false;
    }

    const repCallback = (finished) => {
      if (callback) {
        callback(finished);
      }
      // when cancelled call inner animation's callback
      if (!finished && nextAnimation.callback) {
        nextAnimation.callback(false /* finished */);
      }
    };

    function onStart(animation, value, now, previousAnimation) {
      animation.startValue = value;
      animation.reps = 0;
      nextAnimation.onStart(nextAnimation, value, now, previousAnimation);
    }

    return {
      isHigherOrder: true,
      onFrame: repeat,
      onStart,
      reps: 0,
      current: nextAnimation.current,
      callback: repCallback,
    };
  });
}

/* Deprecated section, kept for backward compatibility. Will be removed soon */
export function delay(delayMs, _nextAnimation) {
  'worklet';
  console.warn('Method `delay` is deprecated. Please use `withDelay` instead');
  return withDelay(delayMs, _nextAnimation);
}

export function repeat(
  _nextAnimation,
  numberOfReps = 2,
  reverse = false,
  callback
) {
  'worklet';
  console.warn(
    'Method `repeat` is deprecated. Please use `withRepeat` instead'
  );
  return withRepeat(_nextAnimation, numberOfReps, reverse, callback);
}

export function loop(nextAnimation, numberOfLoops = 1) {
  'worklet';
  console.warn('Method `loop` is deprecated. Please use `withRepeat` instead');
  return repeat(nextAnimation, Math.round(numberOfLoops * 2), true);
}

export function sequence(..._animations) {
  'worklet';
  console.warn(
    'Method `sequence` is deprecated. Please use `withSequence` instead'
  );
  return withSequence(..._animations);
}
/* Deprecated section end */
