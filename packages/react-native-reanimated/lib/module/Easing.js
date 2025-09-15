'use strict';

import { Bezier } from './Bezier';

/**
 * The `Easing` module implements common easing functions. This module is used
 * by [Animate.timing()](docs/animate.html#timing) to convey physically
 * believable motion in animations.
 *
 * You can find a visualization of some common easing functions at
 * http://easings.net/
 *
 * ### Predefined animations
 *
 * The `Easing` module provides several predefined animations through the
 * following methods:
 *
 * - [`back`](docs/easing.html#back) provides a simple animation where the object
 *   goes slightly back before moving forward
 * - [`bounce`](docs/easing.html#bounce) provides a bouncing animation
 * - [`ease`](docs/easing.html#ease) provides a simple inertial animation
 * - [`elastic`](docs/easing.html#elastic) provides a simple spring interaction
 *
 * ### Standard functions
 *
 * Three standard easing functions are provided:
 *
 * - [`linear`](docs/easing.html#linear)
 * - [`quad`](docs/easing.html#quad)
 * - [`cubic`](docs/easing.html#cubic)
 *
 * The [`poly`](docs/easing.html#poly) function can be used to implement
 * quartic, quintic, and other higher power functions.
 *
 * ### Additional functions
 *
 * Additional mathematical functions are provided by the following methods:
 *
 * - [`bezier`](docs/easing.html#bezier) provides a cubic bezier curve
 * - [`circle`](docs/easing.html#circle) provides a circular function
 * - [`sin`](docs/easing.html#sin) provides a sinusoidal function
 * - [`exp`](docs/easing.html#exp) provides an exponential function
 *
 * The following helpers are used to modify other easing functions.
 *
 * - [`in`](docs/easing.html#in) runs an easing function forwards
 * - [`inOut`](docs/easing.html#inout) makes any easing function symmetrical
 * - [`out`](docs/easing.html#out) runs an easing function backwards
 */

/**
 * A linear function, `f(t) = t`. Position correlates to elapsed time one to
 * one.
 *
 * http://cubic-bezier.com/#0,0,1,1
 */
function linear(t) {
  'worklet';

  return t;
}

/**
 * A simple inertial interaction, similar to an object slowly accelerating to
 * speed.
 *
 * http://cubic-bezier.com/#.42,0,1,1
 */
function ease(t) {
  'worklet';

  return Bezier(0.42, 0, 1, 1)(t);
}

/**
 * A quadratic function, `f(t) = t * t`. Position equals the square of elapsed
 * time.
 *
 * http://easings.net/#easeInQuad
 */
function quad(t) {
  'worklet';

  return t * t;
}

/**
 * A cubic function, `f(t) = t * t * t`. Position equals the cube of elapsed
 * time.
 *
 * http://easings.net/#easeInCubic
 */
function cubic(t) {
  'worklet';

  return t * t * t;
}

/**
 * A power function. Position is equal to the Nth power of elapsed time.
 *
 * N = 4: http://easings.net/#easeInQuart n = 5: http://easings.net/#easeInQuint
 */
function poly(n) {
  'worklet';

  return t => {
    'worklet';

    return Math.pow(t, n);
  };
}

/**
 * A sinusoidal function.
 *
 * http://easings.net/#easeInSine
 */
function sin(t) {
  'worklet';

  return 1 - Math.cos(t * Math.PI / 2);
}

/**
 * A circular function.
 *
 * http://easings.net/#easeInCirc
 */
function circle(t) {
  'worklet';

  return 1 - Math.sqrt(1 - t * t);
}

/**
 * An exponential function.
 *
 * http://easings.net/#easeInExpo
 */
function exp(t) {
  'worklet';

  return Math.pow(2, 10 * (t - 1));
}

/**
 * A simple elastic interaction, similar to a spring oscillating back and forth.
 *
 * Default bounciness is 1, which overshoots a little bit once. 0 bounciness
 * doesn't overshoot at all, and bounciness of N `>` 1 will overshoot about N
 * times.
 *
 * http://easings.net/#easeInElastic
 */
function elastic(bounciness = 1) {
  'worklet';

  const p = bounciness * Math.PI;
  return t => {
    'worklet';

    return 1 - Math.pow(Math.cos(t * Math.PI / 2), 3) * Math.cos(t * p);
  };
}

/**
 * Use with `Animated.parallel()` to create a simple effect where the object
 * animates back slightly as the animation starts.
 *
 * Wolfram Plot:
 *
 * - http://tiny.cc/back_default (s = 1.70158, default)
 */
function back(s = 1.70158) {
  'worklet';

  return t => {
    'worklet';

    return t * t * ((s + 1) * t - s);
  };
}

/**
 * Provides a simple bouncing effect.
 *
 * http://easings.net/#easeInBounce
 */
function bounce(t) {
  'worklet';

  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  }
  if (t < 2 / 2.75) {
    const t2 = t - 1.5 / 2.75;
    return 7.5625 * t2 * t2 + 0.75;
  }
  if (t < 2.5 / 2.75) {
    const t2 = t - 2.25 / 2.75;
    return 7.5625 * t2 * t2 + 0.9375;
  }
  const t2 = t - 2.625 / 2.75;
  return 7.5625 * t2 * t2 + 0.984375;
}

/**
 * Provides a cubic bezier curve, equivalent to CSS Transitions'
 * `transition-timing-function`.
 *
 * A useful tool to visualize cubic bezier curves can be found at
 * http://cubic-bezier.com/
 */
function bezier(x1, y1, x2, y2) {
  'worklet';

  return {
    factory: () => {
      'worklet';

      return Bezier(x1, y1, x2, y2);
    }
  };
}
function bezierFn(x1, y1, x2, y2) {
  'worklet';

  return Bezier(x1, y1, x2, y2);
}

/** Runs an easing function forwards. */
function in_(easing) {
  'worklet';

  return easing;
}

/** Runs an easing function backwards. */
function out(easing) {
  'worklet';

  return t => {
    'worklet';

    return 1 - easing(1 - t);
  };
}

/**
 * Makes any easing function symmetrical. The easing function will run forwards
 * for half of the duration, then backwards for the rest of the duration.
 */
function inOut(easing) {
  'worklet';

  return t => {
    'worklet';

    if (t < 0.5) {
      return easing(t * 2) / 2;
    }
    return 1 - easing((1 - t) * 2) / 2;
  };
}

/**
 * The `steps` easing function jumps between discrete values at regular
 * intervals, creating a stepped animation effect. The `n` parameter determines
 * the number of steps in the animation, and the `roundToNextStep` parameter
 * determines whether the animation should start at the beginning or end of each
 * step.
 */
function steps(n = 10, roundToNextStep = true) {
  'worklet';

  return t => {
    'worklet';

    const value = Math.min(Math.max(t, 0), 1) * n;
    if (roundToNextStep) {
      return Math.ceil(value) / n;
    }
    return Math.floor(value) / n;
  };
}
const EasingObject = {
  linear,
  ease,
  quad,
  cubic,
  poly,
  sin,
  circle,
  exp,
  elastic,
  back,
  bounce,
  bezier,
  bezierFn,
  steps,
  in: in_,
  out,
  inOut
};
export const EasingNameSymbol = Symbol('easingName');
for (const [easingName, easing] of Object.entries(EasingObject)) {
  Object.defineProperty(easing, EasingNameSymbol, {
    value: easingName,
    configurable: false,
    enumerable: false,
    writable: false
  });
}
export const Easing = EasingObject;
//# sourceMappingURL=Easing.js.map