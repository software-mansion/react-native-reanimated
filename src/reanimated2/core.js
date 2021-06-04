"use strict";
exports.__esModule = true;
exports.createAnimatedPropAdapter = exports.runOnJS = exports.stopMapper = exports.startMapper = exports.makeRemote = exports.makeMutable = exports.getTimestamp = exports.getViewProp = exports.makeShareable = exports.runOnUI = exports.requestFrame = exports.isConfiguredCheck = exports.isConfigured = exports.checkPluginState = void 0;
/* global _WORKLET _getCurrentTime _frameTimestamp _eventTimestamp, _setGlobalConsole */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
var NativeReanimated_1 = require("./NativeReanimated");
var react_native_1 = require("react-native");
var ConfigHelper_1 = require("../ConfigHelper");
global.__reanimatedWorkletInit = function (worklet) {
    worklet.__worklet = true;
};
if (global._setGlobalConsole === undefined) {
    // it can happen when Reanimated plugin wasn't added, but the user uses the only API from version 1
    global._setGlobalConsole = function () {
        // noop
    };
}
var testWorklet = function () {
    'worklet';
};
var checkPluginState = function (throwError) {
    if (throwError === void 0) { throwError = true; }
    if (!testWorklet.__workletHash && !process.env.JEST_WORKER_ID) {
        if (throwError) {
            throw new Error("Reanimated 2 failed to create a worklet, maybe you forgot to add Reanimated's babel plugin?");
        }
        return false;
    }
    return true;
};
exports.checkPluginState = checkPluginState;
var isConfigured = function (throwError) {
    if (throwError === void 0) { throwError = false; }
    return exports.checkPluginState(throwError) && !NativeReanimated_1["default"].useOnlyV1;
};
exports.isConfigured = isConfigured;
var isConfiguredCheck = function () {
    if (!exports.isConfigured(true)) {
        throw new Error('If you want to use Reanimated 2 then go through our installation steps https://docs.swmansion.com/react-native-reanimated/docs/installation');
    }
};
exports.isConfiguredCheck = isConfiguredCheck;
function _toArrayReanimated(object) {
    'worklet';
    if (Array.isArray(object)) {
        return object;
    }
    if (typeof Symbol !== 'undefined' &&
        (typeof Symbol === 'function' ? Symbol.iterator : '@@iterator') in
            Object(object))
        return Array.from(object);
    throw new 'Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'();
}
function _mergeObjectsReanimated() {
    'worklet';
    // we can't use rest parameters in worklets at the moment
    // eslint-disable-next-line prefer-rest-params
    return Object.assign.apply(null, arguments);
}
global.__reanimatedWorkletInit = function (worklet) {
    worklet.__worklet = true;
    if (worklet._closure) {
        var closure_1 = worklet._closure;
        Object.keys(closure_1).forEach(function (key) {
            if (key === '_toConsumableArray') {
                closure_1[key] = _toArrayReanimated;
            }
            if (key === '_objectSpread') {
                closure_1[key] = _mergeObjectsReanimated;
            }
        });
    }
};
function pushFrame(frame) {
    NativeReanimated_1["default"].pushFrame(frame);
}
function requestFrame(frame) {
    'worklet';
    if (NativeReanimated_1["default"].native) {
        requestAnimationFrame(frame);
    }
    else {
        pushFrame(frame);
    }
}
exports.requestFrame = requestFrame;
global._WORKLET = false;
global._log = function (s) {
    console.log(s);
};
function runOnUI(worklet) {
    return makeShareable(worklet);
}
exports.runOnUI = runOnUI;
function makeShareable(value) {
    exports.isConfiguredCheck();
    return NativeReanimated_1["default"].makeShareable(value);
}
exports.makeShareable = makeShareable;
function getViewProp(viewTag, propName) {
    return new Promise(function (resolve, reject) {
        return NativeReanimated_1["default"].getViewProp(viewTag, propName, function (result) {
            if (result.substr(0, 6) === 'error:') {
                reject(result);
            }
            else {
                resolve(result);
            }
        });
    });
}
exports.getViewProp = getViewProp;
var _getTimestamp;
if (process.env.JEST_WORKER_ID) {
    _getTimestamp = function () {
        return Date.now();
    };
}
else {
    _getTimestamp = function () {
        'worklet';
        if (_frameTimestamp) {
            return _frameTimestamp;
        }
        if (_eventTimestamp) {
            return _eventTimestamp;
        }
        return _getCurrentTime();
    };
}
function getTimestamp() {
    'worklet';
    if (react_native_1.Platform.OS === 'web') {
        return NativeReanimated_1["default"].getTimestamp();
    }
    return _getTimestamp();
}
exports.getTimestamp = getTimestamp;
function workletValueSetter(value) {
    'worklet';
    var _this = this;
    var previousAnimation = this._animation;
    if (previousAnimation) {
        previousAnimation.cancelled = true;
        this._animation = null;
    }
    if (typeof value === 'function' ||
        (value !== null && typeof value === 'object' && value.onFrame)) {
        var animation_1 = typeof value === 'function' ? value() : value;
        // prevent setting again to the same value
        // and triggering the mappers that treat this value as an input
        // this happens when the animation's target value(stored in animation.current until animation.onStart is called) is set to the same value as a current one(this._value)
        // built in animations that are not higher order(withTiming, withSpring) hold target value in .current
        if (this._value === animation_1.current && !animation_1.isHigherOrder) {
            return;
        }
        // animated set
        var initializeAnimation = function (timestamp) {
            animation_1.onStart(animation_1, _this.value, timestamp, previousAnimation);
        };
        initializeAnimation(getTimestamp());
        var step_1 = function (timestamp) {
            if (animation_1.cancelled) {
                animation_1.callback && animation_1.callback(false /* finished */);
                return;
            }
            var finished = animation_1.onFrame(animation_1, timestamp);
            animation_1.finished = true;
            animation_1.timestamp = timestamp;
            _this._value = animation_1.current;
            if (finished) {
                animation_1.callback && animation_1.callback(true /* finished */);
            }
            else {
                requestAnimationFrame(step_1);
            }
        };
        this._animation = animation_1;
        if (_frameTimestamp) {
            // frame
            step_1(_frameTimestamp);
        }
        else {
            requestAnimationFrame(step_1);
        }
    }
    else {
        // prevent setting again to the same value
        // and triggering the mappers that treat this value as an input
        if (this._value === value) {
            return;
        }
        this._value = value;
    }
}
// We cannot use pushFrame
// so we use own implementation for js
function workletValueSetterJS(value) {
    var _this = this;
    var previousAnimation = this._animation;
    if (previousAnimation) {
        previousAnimation.cancelled = true;
        this._animation = null;
    }
    if (typeof value === 'function' ||
        (value !== null && typeof value === 'object' && value.onFrame)) {
        // animated set
        var animation_2 = typeof value === 'function' ? value() : value;
        var initializeAnimation_1 = function (timestamp) {
            animation_2.onStart(animation_2, _this.value, timestamp, previousAnimation);
        };
        var step_2 = function (timestamp) {
            if (animation_2.cancelled) {
                animation_2.callback && animation_2.callback(false /* finished */);
                return;
            }
            if (initializeAnimation_1) {
                initializeAnimation_1(timestamp);
                initializeAnimation_1 = null; // prevent closure from keeping ref to previous animation
            }
            var finished = animation_2.onFrame(animation_2, timestamp);
            animation_2.timestamp = timestamp;
            _this._setValue(animation_2.current);
            if (finished) {
                animation_2.callback && animation_2.callback(true /* finished */);
            }
            else {
                requestFrame(step_2);
            }
        };
        this._animation = animation_2;
        requestFrame(step_2);
    }
    else {
        this._setValue(value);
    }
}
function makeMutable(value) {
    exports.isConfiguredCheck();
    return NativeReanimated_1["default"].makeMutable(value);
}
exports.makeMutable = makeMutable;
function makeRemote(object) {
    if (object === void 0) { object = {}; }
    exports.isConfiguredCheck();
    return NativeReanimated_1["default"].makeRemote(object);
}
exports.makeRemote = makeRemote;
function startMapper(mapper, inputs, outputs) {
    if (inputs === void 0) { inputs = []; }
    if (outputs === void 0) { outputs = []; }
    exports.isConfiguredCheck();
    return NativeReanimated_1["default"].startMapper(mapper, inputs, outputs);
}
exports.startMapper = startMapper;
function stopMapper(mapperId) {
    NativeReanimated_1["default"].stopMapper(mapperId);
}
exports.stopMapper = stopMapper;
var runOnJS = function (fun) {
    'worklet';
    if (!_WORKLET) {
        return fun;
    }
    if (!fun.__callAsync) {
        throw new Error("Attempting to call runOnJS with an object that is not a host function. Using runOnJS is only possible with methods that are defined on the main React-Native Javascript thread and that aren't marked as worklets");
    }
    else {
        return fun.__callAsync;
    }
};
exports.runOnJS = runOnJS;
function createAnimatedPropAdapter(adapter, nativeProps) {
    var nativePropsToAdd = {};
    // eslint-disable-next-line no-unused-expressions
    nativeProps === null || nativeProps === void 0 ? void 0 : nativeProps.forEach(function (prop) {
        nativePropsToAdd[prop] = true;
    });
    ConfigHelper_1.addWhitelistedNativeProps(nativePropsToAdd);
    return adapter;
}
exports.createAnimatedPropAdapter = createAnimatedPropAdapter;
if (!NativeReanimated_1["default"].useOnlyV1) {
    NativeReanimated_1["default"].installCoreFunctions(NativeReanimated_1["default"].native ? workletValueSetter : workletValueSetterJS);
    var capturableConsole_1 = console;
    exports.isConfigured() &&
        runOnUI(function () {
            'worklet';
            var console = {
                debug: exports.runOnJS(capturableConsole_1.debug),
                log: exports.runOnJS(capturableConsole_1.log),
                warn: exports.runOnJS(capturableConsole_1.warn),
                error: exports.runOnJS(capturableConsole_1.error),
                info: exports.runOnJS(capturableConsole_1.info)
            };
            _setGlobalConsole(console);
        })();
}
