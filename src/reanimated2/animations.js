"use strict";
exports.__esModule = true;
exports.sequence = exports.loop = exports.repeat = exports.delay = exports.withRepeat = exports.withSequence = exports.withDelay = exports.withDecay = exports.withSpring = exports.withStyleAnimation = exports.withTiming = exports.withStartValue = exports.cancelAnimation = exports.defineAnimation = exports.decorateAnimation = exports.transformAnimation = exports.transform = exports.initialUpdaterRun = void 0;
/* global _WORKLET */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
var Easing_1 = require("./Easing");
var Colors_1 = require("./Colors");
var NativeReanimated_1 = require("./NativeReanimated");
var react_native_1 = require("react-native");
var IN_STYLE_UPDATER = false;
function initialUpdaterRun(updater) {
    IN_STYLE_UPDATER = true;
    var result = updater();
    IN_STYLE_UPDATER = false;
    return result;
}
exports.initialUpdaterRun = initialUpdaterRun;
function transform(value, handler) {
    'worklet';
    if (value === undefined) {
        return undefined;
    }
    if (typeof value === 'string') {
        // toInt
        // TODO handle color
        var match = value.match(/([A-Za-z]*)(-?\d*\.?\d*)([A-Za-z%]*)/);
        var prefix = match[1];
        var suffix = match[3];
        var number = match[2];
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
exports.transform = transform;
function transformAnimation(animation) {
    'worklet';
    if (!animation) {
        return;
    }
    animation.toValue = transform(animation.toValue, animation);
    animation.current = transform(animation.current, animation);
    animation.startValue = transform(animation.startValue, animation);
}
exports.transformAnimation = transformAnimation;
function decorateAnimation(animation) {
    'worklet';
    if (animation.isHigherOrder) {
        return;
    }
    var baseOnStart = animation.onStart;
    var baseOnFrame = animation.onFrame;
    var animationCopy = Object.assign({}, animation);
    delete animationCopy.callback;
    var prefNumberSuffOnStart = function (animation, value, timestamp, previousAnimation) {
        var val = transform(value, animation);
        transformAnimation(animation);
        if (previousAnimation !== animation)
            transformAnimation(previousAnimation);
        baseOnStart(animation, val, timestamp, previousAnimation);
        transformAnimation(animation);
        if (previousAnimation !== animation)
            transformAnimation(previousAnimation);
    };
    var prefNumberSuffOnFrame = function (animation, timestamp) {
        transformAnimation(animation);
        var res = baseOnFrame(animation, timestamp);
        transformAnimation(animation);
        return res;
    };
    var tab = ['H', 'S', 'V', 'A'];
    var colorOnStart = function (animation, value, timestamp, previousAnimation) {
        var HSVAValue;
        var HSVACurrent;
        var HSVAToValue;
        var res = [];
        if (Colors_1.isColor(value)) {
            HSVACurrent = Colors_1.convertToHSVA(animation.current);
            HSVAValue = Colors_1.convertToHSVA(value);
            if (animation.toValue) {
                HSVAToValue = Colors_1.convertToHSVA(animation.toValue);
            }
        }
        tab.forEach(function (i, index) {
            animation[i] = Object.assign({}, animationCopy);
            animation[i].current = HSVACurrent[index];
            animation[i].toValue = HSVAToValue ? HSVAToValue[index] : undefined;
            animation[i].onStart(animation[i], HSVAValue[index], timestamp, previousAnimation ? previousAnimation[i] : undefined);
            res.push(animation[i].current);
        });
        animation.current = Colors_1.toRGBA(res);
    };
    var colorOnFrame = function (animation, timestamp) {
        var HSVACurrent = Colors_1.convertToHSVA(animation.current);
        var res = [];
        var finished = true;
        tab.forEach(function (i, index) {
            animation[i].current = HSVACurrent[index];
            finished &= animation[i].onFrame(animation[i], timestamp);
            res.push(animation[i].current);
        });
        animation.current = Colors_1.toRGBA(res);
        return finished;
    };
    animation.onStart = function (animation, value, timestamp, previousAnimation) {
        if (Colors_1.isColor(value)) {
            colorOnStart(animation, value, timestamp, previousAnimation);
            animation.onFrame = colorOnFrame;
            return;
        }
        else if (typeof value === 'string') {
            prefNumberSuffOnStart(animation, value, timestamp, previousAnimation);
            animation.onFrame = prefNumberSuffOnFrame;
            return;
        }
        baseOnStart(animation, value, timestamp, previousAnimation);
    };
}
exports.decorateAnimation = decorateAnimation;
function defineAnimation(starting, factory) {
    'worklet';
    if (IN_STYLE_UPDATER) {
        return starting;
    }
    var create = function () {
        'worklet';
        var animation = factory();
        decorateAnimation(animation);
        return animation;
    };
    if (_WORKLET || !NativeReanimated_1["default"].native) {
        return create();
    }
    return create;
}
exports.defineAnimation = defineAnimation;
function cancelAnimation(sharedValue) {
    'worklet';
    // setting the current value cancels the animation if one is currently running
    sharedValue.value = sharedValue.value; // eslint-disable-line no-self-assign
}
exports.cancelAnimation = cancelAnimation;
// TODO it should work only if there was no animation before.
function withStartValue(startValue, animation) {
    'worklet';
    return defineAnimation(startValue, function () {
        'worklet';
        if (!_WORKLET && typeof animation === 'function') {
            animation = animation();
        }
        animation.current = startValue;
        return animation;
    });
}
exports.withStartValue = withStartValue;
function withTiming(toValue, userConfig, callback) {
    'worklet';
    return defineAnimation(toValue, function () {
        'worklet';
        var config = {
            duration: 300,
            easing: Easing_1.Easing.inOut(Easing_1.Easing.quad)
        };
        if (userConfig) {
            Object.keys(userConfig).forEach(function (key) { return (config[key] = userConfig[key]); });
        }
        function timing(animation, now) {
            var toValue = animation.toValue, progress = animation.progress, startTime = animation.startTime, current = animation.current;
            var runtime = now - startTime;
            if (runtime >= config.duration) {
                // reset startTime to avoid reusing finished animation config in `start` method
                animation.startTime = 0;
                animation.current = toValue;
                return true;
            }
            var newProgress = config.easing(runtime / config.duration);
            var dist = ((toValue - current) * (newProgress - progress)) / (1 - progress);
            animation.current += dist;
            animation.progress = newProgress;
            return false;
        }
        function onStart(animation, value, now, previousAnimation) {
            if (previousAnimation &&
                previousAnimation.type === 'timing' &&
                previousAnimation.toValue === toValue &&
                previousAnimation.startTime) {
                // to maintain continuity of timing animations we check if we are starting
                // new timing over the old one with the same parameters. If so, we want
                // to copy animation timeline properties
                animation.startTime = previousAnimation.startTime;
                animation.progress = previousAnimation.progress;
            }
            else {
                animation.startTime = now;
                animation.progress = 0;
            }
            animation.current = value;
        }
        return {
            type: 'timing',
            onFrame: timing,
            onStart: onStart,
            progress: 0,
            toValue: toValue,
            current: toValue,
            callback: callback
        };
    });
}
exports.withTiming = withTiming;
function withStyleAnimation(styleAnimations) {
    'worklet';
    return defineAnimation({}, function () {
        'worklet';
        var onFrame = function (animation, now) {
            var stillGoing = false;
            Object.keys(styleAnimations).forEach(function (key) {
                var currentAnimation = animation.styleAnimations[key];
                if (key === 'transform') {
                    var transform_1 = animation.styleAnimations.transform;
                    for (var i = 0; i < transform_1.length; i++) {
                        var type = Object.keys(transform_1[i])[0];
                        var currentAnimation_1 = transform_1[i][type];
                        if (currentAnimation_1.finished) {
                            continue;
                        }
                        var finished = currentAnimation_1.onFrame(currentAnimation_1, now);
                        if (finished) {
                            currentAnimation_1.finished = true;
                            if (currentAnimation_1.callback) {
                                currentAnimation_1.callback(true);
                            }
                        }
                        else {
                            stillGoing = true;
                        }
                        animation.current.transform[i][type] = currentAnimation_1.current;
                    }
                }
                else {
                    if (!currentAnimation.finished) {
                        var finished = currentAnimation.onFrame(currentAnimation, now);
                        if (finished) {
                            currentAnimation.finished = true;
                            if (currentAnimation.callback) {
                                currentAnimation.callback(true);
                            }
                        }
                        else {
                            stillGoing = true;
                        }
                        animation.current[key] = currentAnimation.current;
                    }
                }
            });
            return !stillGoing;
        };
        var onStart = function (animation, value, now, previousAnimation) {
            Object.keys(styleAnimations).forEach(function (key) {
                if (key === 'transform') {
                    animation.current.transform = [];
                    var transform_2 = styleAnimations.transform;
                    var prevTransform = null;
                    var valueTransform = value.transform;
                    if (previousAnimation &&
                        previousAnimation.styleAnimations &&
                        previousAnimation.styleAnimations.transform) {
                        prevAnimation = previousAnimation.styleAnimations.transform;
                    }
                    for (var i = 0; i < transform_2.length; i++) {
                        // duplication of code to avoid function calls
                        var prevAnimation = null;
                        var type = Object.keys(transform_2[i])[0];
                        if (prevTransform && prevTransform.length > i) {
                            var prevTransformStep = prevTransform[i];
                            var prevType = Object.keys(prevTransformStep)[0];
                            if (prevType === type) {
                                prevAnimation = prevTransformStep[prevType];
                            }
                        }
                        var prevVal = 0;
                        if (prevAnimation != null) {
                            prevVal = prevAnimation.current;
                        }
                        if (valueTransform != null &&
                            valueTransform.length > i &&
                            valueTransform[i][type]) {
                            prevVal = valueTransform[i][type];
                        }
                        var obj = {};
                        obj[type] = prevVal;
                        animation.current.transform[i] = obj;
                        var currentAnimation = transform_2[i][type];
                        if (typeof currentAnimation != 'object' && !Array.isArray(currentAnimation)) {
                            currentAnimation = withTiming(currentAnimation, { duration: 0 });
                            transform_2[i][type] = currentAnimation;
                        }
                        currentAnimation.onStart(currentAnimation, prevVal, now, prevAnimation);
                    }
                }
                else {
                    var prevAnimation = null;
                    if (previousAnimation &&
                        previousAnimation.styleAnimations &&
                        previousAnimation.styleAnimations[key]) {
                        prevAnimation = previousAnimation.styleAnimations[key];
                    }
                    var prevVal = 0;
                    if (prevAnimation != null) {
                        prevVal = prevAnimation.current;
                    }
                    if (value[key]) {
                        prevVal = value[key];
                    }
                    animation.current[key] = prevVal;
                    var currentAnimation = animation.styleAnimations[key];
                    if (typeof currentAnimation != 'object' && !Array.isArray(currentAnimation)) {
                        currentAnimation = withTiming(currentAnimation, { duration: 0 });
                        animation.styleAnimations[key] = currentAnimation;
                    }
                    currentAnimation.onStart(currentAnimation, prevVal, now, prevAnimation);
                }
            });
        };
        var callback = function (finished) {
            if (!finished) {
                Object.keys(styleAnimations).forEach(function (key) {
                    var currentAnimation = styleAnimations[key];
                    if (key === 'transform') {
                        var transform_3 = styleAnimations.transform;
                        for (var i = 0; i < transform_3.length; i++) {
                            var type = Object.keys(transform_3[i])[0];
                            var currentAnimation_2 = transform_3[i][type];
                            if (currentAnimation_2.finished) {
                                continue;
                            }
                            if (currentAnimation_2.callback) {
                                currentAnimation_2.callback(false);
                            }
                        }
                    }
                    else {
                        if (!currentAnimation.finished) {
                            if (currentAnimation.callback) {
                                currentAnimation.callback(false);
                            }
                        }
                    }
                });
            }
        };
        return {
            isHigherOrder: true,
            onFrame: onFrame,
            onStart: onStart,
            current: {},
            styleAnimations: styleAnimations,
            callback: callback
        };
    });
}
exports.withStyleAnimation = withStyleAnimation;
function withSpring(toValue, userConfig, callback) {
    'worklet';
    return defineAnimation(toValue, function () {
        'worklet';
        // TODO: figure out why we can't use spread or Object.assign here
        // when user config is "frozen object" we can't enumerate it (perhaps
        // something is wrong with the object prototype).
        var config = {
            damping: 10,
            mass: 1,
            stiffness: 100,
            overshootClamping: false,
            restDisplacementThreshold: 0.01,
            restSpeedThreshold: 2
        };
        if (userConfig) {
            Object.keys(userConfig).forEach(function (key) { return (config[key] = userConfig[key]); });
        }
        function spring(animation, now) {
            var toValue = animation.toValue, lastTimestamp = animation.lastTimestamp, current = animation.current, velocity = animation.velocity;
            var deltaTime = Math.min(now - lastTimestamp, 64);
            animation.lastTimestamp = now;
            var c = config.damping;
            var m = config.mass;
            var k = config.stiffness;
            var v0 = -velocity;
            var x0 = toValue - current;
            var zeta = c / (2 * Math.sqrt(k * m)); // damping ratio
            var omega0 = Math.sqrt(k / m); // undamped angular frequency of the oscillator (rad/ms)
            var omega1 = omega0 * Math.sqrt(1 - Math.pow(zeta, 2)); // exponential decay
            var t = deltaTime / 1000;
            var sin1 = Math.sin(omega1 * t);
            var cos1 = Math.cos(omega1 * t);
            // under damped
            var underDampedEnvelope = Math.exp(-zeta * omega0 * t);
            var underDampedFrag1 = underDampedEnvelope *
                (sin1 * ((v0 + zeta * omega0 * x0) / omega1) + x0 * cos1);
            var underDampedPosition = toValue - underDampedFrag1;
            // This looks crazy -- it's actually just the derivative of the oscillation function
            var underDampedVelocity = zeta * omega0 * underDampedFrag1 -
                underDampedEnvelope *
                    (cos1 * (v0 + zeta * omega0 * x0) - omega1 * x0 * sin1);
            // critically damped
            var criticallyDampedEnvelope = Math.exp(-omega0 * t);
            var criticallyDampedPosition = toValue - criticallyDampedEnvelope * (x0 + (v0 + omega0 * x0) * t);
            var criticallyDampedVelocity = criticallyDampedEnvelope *
                (v0 * (t * omega0 - 1) + t * x0 * omega0 * omega0);
            var isOvershooting = function () {
                if (config.overshootClamping && config.stiffness !== 0) {
                    return current < toValue
                        ? animation.current > toValue
                        : animation.current < toValue;
                }
                else {
                    return false;
                }
            };
            var isVelocity = Math.abs(velocity) < config.restSpeedThreshold;
            var isDisplacement = config.stiffness === 0 ||
                Math.abs(toValue - current) < config.restDisplacementThreshold;
            if (zeta < 1) {
                animation.current = underDampedPosition;
                animation.velocity = underDampedVelocity;
            }
            else {
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
            }
            else {
                animation.lastTimestamp = now;
            }
        }
        return {
            onFrame: spring,
            onStart: onStart,
            toValue: toValue,
            velocity: config.velocity || 0,
            current: toValue,
            callback: callback
        };
    });
}
exports.withSpring = withSpring;
function withDecay(userConfig, callback) {
    'worklet';
    return defineAnimation(0, function () {
        'worklet';
        var config = {
            deceleration: 0.998,
            velocityFactor: react_native_1.Platform.OS !== 'web' ? 1 : 1000
        };
        if (userConfig) {
            Object.keys(userConfig).forEach(function (key) { return (config[key] = userConfig[key]); });
        }
        var VELOCITY_EPS = react_native_1.Platform.OS !== 'web' ? 1 : 1 / 20;
        var SLOPE_FACTOR = 0.1;
        function decay(animation, now) {
            var lastTimestamp = animation.lastTimestamp, startTimestamp = animation.startTimestamp, initialVelocity = animation.initialVelocity, current = animation.current, velocity = animation.velocity;
            var deltaTime = Math.min(now - lastTimestamp, 64);
            var v = velocity *
                Math.exp(-(1 - config.deceleration) * (now - startTimestamp) * SLOPE_FACTOR);
            animation.current =
                current + (v * config.velocityFactor * deltaTime) / 1000; // /1000 because time is in ms not in s
            animation.velocity = v;
            animation.lastTimestamp = now;
            if (config.clamp) {
                if (initialVelocity < 0 && animation.current <= config.clamp[0]) {
                    animation.current = config.clamp[0];
                    return true;
                }
                else if (initialVelocity > 0 &&
                    animation.current >= config.clamp[1]) {
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
                        console.error("clamp array must contain 2 items but is given " + config.clamp.length);
                    }
                }
                else {
                    console.error("config.clamp must be an array but is " + typeof config.clamp);
                }
            }
            if (config.velocityFactor <= 0) {
                console.error("config.velocityFactor must be greather then 0 but is " + config.velocityFactor);
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
            onStart: onStart,
            velocity: config.velocity || 0,
            callback: callback
        };
    });
}
exports.withDecay = withDecay;
function withDelay(delayMs, _nextAnimation) {
    'worklet';
    return defineAnimation(_nextAnimation, function () {
        'worklet';
        var nextAnimation = typeof _nextAnimation === 'function' ? _nextAnimation() : _nextAnimation;
        function delay(animation, now) {
            var startTime = animation.startTime, started = animation.started, previousAnimation = animation.previousAnimation;
            if (now - startTime > delayMs) {
                if (!started) {
                    nextAnimation.onStart(nextAnimation, animation.current, now, previousAnimation);
                    animation.previousAnimation = null;
                    animation.started = true;
                }
                var finished = nextAnimation.onFrame(nextAnimation, now);
                animation.current = nextAnimation.current;
                return finished;
            }
            else if (previousAnimation) {
                var finished = previousAnimation.onFrame(previousAnimation, now);
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
        var callback = function (finished) {
            if (nextAnimation.callback) {
                nextAnimation.callback(finished);
            }
        };
        return {
            isHigherOrder: true,
            onFrame: delay,
            onStart: onStart,
            current: nextAnimation.current,
            callback: callback
        };
    });
}
exports.withDelay = withDelay;
function withSequence() {
    'worklet';
    var _animations = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        _animations[_i] = arguments[_i];
    }
    return defineAnimation(_animations[0], function () {
        'worklet';
        var animations = _animations.map(function (a) {
            var result = typeof a === 'function' ? a() : a;
            result.finished = false;
            return result;
        });
        var firstAnimation = animations[0];
        var callback = function (finished) {
            if (finished) {
                // we want to call the callback after every single animation
                // not after all of them
                return;
            }
            // this is going to be called only if sequence has been cancelled
            animations.forEach(function (animation) {
                if (typeof animation.callback === 'function' && !animation.finished) {
                    animation.callback(finished);
                }
            });
        };
        function sequence(animation, now) {
            var currentAnim = animations[animation.animationIndex];
            var finished = currentAnim.onFrame(currentAnim, now);
            animation.current = currentAnim.current;
            if (finished) {
                // we want to call the callback after every single animation
                if (currentAnim.callback) {
                    currentAnim.callback(true /* finished */);
                }
                currentAnim.finished = true;
                animation.animationIndex += 1;
                if (animation.animationIndex < animations.length) {
                    var nextAnim = animations[animation.animationIndex];
                    nextAnim.onStart(nextAnim, currentAnim.current, now, currentAnim);
                    return false;
                }
                return true;
            }
            return false;
        }
        function onStart(animation, value, now, previousAnimation) {
            if (animations.length === 1) {
                throw Error('withSequence() animation require more than one animation as argument');
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
            onStart: onStart,
            animationIndex: 0,
            current: firstAnimation.current,
            callback: callback
        };
    });
}
exports.withSequence = withSequence;
function withRepeat(_nextAnimation, numberOfReps, reverse, callback) {
    'worklet';
    if (numberOfReps === void 0) { numberOfReps = 2; }
    if (reverse === void 0) { reverse = false; }
    return defineAnimation(_nextAnimation, function () {
        'worklet';
        var nextAnimation = typeof _nextAnimation === 'function' ? _nextAnimation() : _nextAnimation;
        function repeat(animation, now) {
            var finished = nextAnimation.onFrame(nextAnimation, now);
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
                var startValue = reverse
                    ? nextAnimation.current
                    : animation.startValue;
                if (reverse) {
                    nextAnimation.toValue = animation.startValue;
                    animation.startValue = startValue;
                }
                nextAnimation.onStart(nextAnimation, startValue, now, nextAnimation.previousAnimation);
                return false;
            }
            return false;
        }
        var repCallback = function (finished) {
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
            onStart: onStart,
            reps: 0,
            current: nextAnimation.current,
            callback: repCallback
        };
    });
}
exports.withRepeat = withRepeat;
/* Deprecated section, kept for backward compatibility. Will be removed soon */
function delay(delayMs, _nextAnimation) {
    'worklet';
    console.warn('Method `delay` is deprecated. Please use `withDelay` instead');
    return withDelay(delayMs, _nextAnimation);
}
exports.delay = delay;
function repeat(_nextAnimation, numberOfReps, reverse, callback) {
    'worklet';
    if (numberOfReps === void 0) { numberOfReps = 2; }
    if (reverse === void 0) { reverse = false; }
    console.warn('Method `repeat` is deprecated. Please use `withRepeat` instead');
    return withRepeat(_nextAnimation, numberOfReps, reverse, callback);
}
exports.repeat = repeat;
function loop(nextAnimation, numberOfLoops) {
    'worklet';
    if (numberOfLoops === void 0) { numberOfLoops = 1; }
    console.warn('Method `loop` is deprecated. Please use `withRepeat` instead');
    return repeat(nextAnimation, Math.round(numberOfLoops * 2), true);
}
exports.loop = loop;
function sequence() {
    'worklet';
    var _animations = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        _animations[_i] = arguments[_i];
    }
    console.warn('Method `sequence` is deprecated. Please use `withSequence` instead');
    return withSequence.apply(void 0, _animations);
}
exports.sequence = sequence;
/* Deprecated section end */
