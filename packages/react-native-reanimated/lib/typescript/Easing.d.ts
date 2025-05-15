import type { EasingFunction } from './commonTypes';
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
/** @deprecated Please use {@link EasingFunction} type instead. */
export type EasingFn = EasingFunction;
export type EasingFunctionFactory = {
    factory: () => EasingFunction;
};
/** @deprecated Please use {@link EasingFunctionFactory} type instead. */
export type EasingFactoryFn = EasingFunctionFactory;
/**
 * A linear function, `f(t) = t`. Position correlates to elapsed time one to
 * one.
 *
 * http://cubic-bezier.com/#0,0,1,1
 */
declare function linear(t: number): number;
/**
 * A simple inertial interaction, similar to an object slowly accelerating to
 * speed.
 *
 * http://cubic-bezier.com/#.42,0,1,1
 */
declare function ease(t: number): number;
/**
 * A quadratic function, `f(t) = t * t`. Position equals the square of elapsed
 * time.
 *
 * http://easings.net/#easeInQuad
 */
declare function quad(t: number): number;
/**
 * A cubic function, `f(t) = t * t * t`. Position equals the cube of elapsed
 * time.
 *
 * http://easings.net/#easeInCubic
 */
declare function cubic(t: number): number;
/**
 * A power function. Position is equal to the Nth power of elapsed time.
 *
 * N = 4: http://easings.net/#easeInQuart n = 5: http://easings.net/#easeInQuint
 */
declare function poly(n: number): EasingFunction;
/**
 * A sinusoidal function.
 *
 * http://easings.net/#easeInSine
 */
declare function sin(t: number): number;
/**
 * A circular function.
 *
 * http://easings.net/#easeInCirc
 */
declare function circle(t: number): number;
/**
 * An exponential function.
 *
 * http://easings.net/#easeInExpo
 */
declare function exp(t: number): number;
/**
 * A simple elastic interaction, similar to a spring oscillating back and forth.
 *
 * Default bounciness is 1, which overshoots a little bit once. 0 bounciness
 * doesn't overshoot at all, and bounciness of N `>` 1 will overshoot about N
 * times.
 *
 * http://easings.net/#easeInElastic
 */
declare function elastic(bounciness?: number): EasingFunction;
/**
 * Use with `Animated.parallel()` to create a simple effect where the object
 * animates back slightly as the animation starts.
 *
 * Wolfram Plot:
 *
 * - http://tiny.cc/back_default (s = 1.70158, default)
 */
declare function back(s?: number): (t: number) => number;
/**
 * Provides a simple bouncing effect.
 *
 * http://easings.net/#easeInBounce
 */
declare function bounce(t: number): number;
/**
 * Provides a cubic bezier curve, equivalent to CSS Transitions'
 * `transition-timing-function`.
 *
 * A useful tool to visualize cubic bezier curves can be found at
 * http://cubic-bezier.com/
 */
declare function bezier(x1: number, y1: number, x2: number, y2: number): EasingFunctionFactory;
declare function bezierFn(x1: number, y1: number, x2: number, y2: number): (x: number) => number;
/** Runs an easing function forwards. */
declare function in_(easing: EasingFunction): EasingFunction;
/** Runs an easing function backwards. */
declare function out(easing: EasingFunction): EasingFunction;
/**
 * Makes any easing function symmetrical. The easing function will run forwards
 * for half of the duration, then backwards for the rest of the duration.
 */
declare function inOut(easing: EasingFunction): EasingFunction;
/**
 * The `steps` easing function jumps between discrete values at regular
 * intervals, creating a stepped animation effect. The `n` parameter determines
 * the number of steps in the animation, and the `roundToNextStep` parameter
 * determines whether the animation should start at the beginning or end of each
 * step.
 */
declare function steps(n?: number, roundToNextStep?: boolean): EasingFunction;
export declare const EasingNameSymbol: unique symbol;
export declare const Easing: {
    linear: typeof linear;
    ease: typeof ease;
    quad: typeof quad;
    cubic: typeof cubic;
    poly: typeof poly;
    sin: typeof sin;
    circle: typeof circle;
    exp: typeof exp;
    elastic: typeof elastic;
    back: typeof back;
    bounce: typeof bounce;
    bezier: typeof bezier;
    bezierFn: typeof bezierFn;
    steps: typeof steps;
    in: typeof in_;
    out: typeof out;
    inOut: typeof inOut;
};
export {};
//# sourceMappingURL=Easing.d.ts.map