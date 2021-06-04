"use strict";
// spread and rest parameters can't be used in worklets right now
/* eslint-disable prefer-rest-params */
/* eslint-disable prefer-spread */
exports.__esModule = true;
exports.Easing = void 0;
/* global _WORKLET */
// @ts-ignore reanimated1/Easing is JS file
var Easing_1 = require("../reanimated1/Easing");
var Bezier_1 = require("./Bezier");
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
    return Bezier_1.Bezier(0.42, 0, 1, 1)(t);
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
 * n = 4: http://easings.net/#easeInQuart
 * n = 5: http://easings.net/#easeInQuint
 */
function poly(n) {
    'worklet';
    return function (t) { return Math.pow(t, n); };
}
/**
 * A sinusoidal function.
 *
 * http://easings.net/#easeInSine
 */
function sin(t) {
    'worklet';
    return 1 - Math.cos((t * Math.PI) / 2);
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
 * A simple elastic interaction, similar to a spring oscillating back and
 * forth.
 *
 * Default bounciness is 1, which overshoots a little bit once. 0 bounciness
 * doesn't overshoot at all, and bounciness of N > 1 will overshoot about N
 * times.
 *
 * http://easings.net/#easeInElastic
 */
function elastic(bounciness) {
    'worklet';
    if (bounciness === void 0) { bounciness = 1; }
    var p = bounciness * Math.PI;
    return function (t) {
        'worklet';
        return 1 - Math.pow(Math.cos((t * Math.PI) / 2), 3) * Math.cos(t * p);
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
function back(s) {
    'worklet';
    if (s === void 0) { s = 1.70158; }
    return function (t) { return t * t * ((s + 1) * t - s); };
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
        var t2_1 = t - 1.5 / 2.75;
        return 7.5625 * t2_1 * t2_1 + 0.75;
    }
    if (t < 2.5 / 2.75) {
        var t2_2 = t - 2.25 / 2.75;
        return 7.5625 * t2_2 * t2_2 + 0.9375;
    }
    var t2 = t - 2.625 / 2.75;
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
    return Bezier_1.Bezier(x1, y1, x2, y2);
}
/**
 * Runs an easing function forwards.
 */
function in_(easing) {
    'worklet';
    return easing;
}
/**
 * Runs an easing function backwards.
 */
function out(easing) {
    'worklet';
    return function (t) {
        'worklet';
        return 1 - easing(1 - t);
    };
}
/**
 * Makes any easing function symmetrical. The easing function will run
 * forwards for half of the duration, then backwards for the rest of the
 * duration.
 */
function inOut(easing) {
    'worklet';
    return function (t) {
        'worklet';
        if (t < 0.5) {
            return easing(t * 2) / 2;
        }
        return 1 - easing((1 - t) * 2) / 2;
    };
}
var EasingObject = {
    linear: linear,
    ease: ease,
    quad: quad,
    cubic: cubic,
    poly: poly,
    sin: sin,
    circle: circle,
    exp: exp,
    elastic: elastic,
    back: back,
    bounce: bounce,
    bezier: bezier,
    "in": in_,
    out: out,
    inOut: inOut
};
// TODO type worklets
function createChecker(worklet, workletName, prevArgs) {
    /* should return Animated.Value or worklet */
    function checkIfReaOne() {
        'worklet';
        if (arguments && !_WORKLET) {
            for (var i = 0; i < arguments.length; i++) {
                var arg = arguments[i];
                if (arg && arg.__nodeID) {
                    console.warn("Easing was renamed to EasingNode in Reanimated 2. Please use EasingNode instead");
                    if (prevArgs) {
                        return Easing_1["default"][workletName]
                            .apply(undefined, prevArgs)
                            .apply(undefined, arguments);
                    }
                    return Easing_1["default"][workletName].apply(undefined, arguments);
                }
            }
        }
        // @ts-ignore this is implicitly any - TODO
        var res = worklet.apply(this, arguments);
        if (!_WORKLET && res && typeof res === 'function' && res.__worklet) {
            return createChecker(res, workletName, arguments);
        }
        return res;
    }
    // use original worklet on UI side
    checkIfReaOne._closure = worklet._closure;
    checkIfReaOne.asString = worklet.asString;
    checkIfReaOne.__workletHash = worklet.__workletHash;
    checkIfReaOne.__location = worklet.__location;
    return checkIfReaOne;
}
Object.keys(EasingObject).forEach(function (key) {
    EasingObject[key] = createChecker(EasingObject[key], key);
});
exports.Easing = EasingObject;
