"use strict";
exports.__esModule = true;
exports.BaseBounceAnimationBuilder = exports.BaseAnimationBuilder = exports.Layout = exports.DefaultExiting = exports.DefaultLayout = exports.DefaultEntering = void 0;
var animations_1 = require("../animations");
var DefaultEntering = function (targetValues) {
    'worklet';
    return {
        initialValues: {
            originX: targetValues.originX,
            originY: targetValues.originY,
            width: targetValues.width,
            height: targetValues.height
        },
        animations: {}
    };
};
exports.DefaultEntering = DefaultEntering;
var DefaultLayout = function (_) {
    'worklet';
    return {
        initialValues: {},
        animations: {}
    };
};
exports.DefaultLayout = DefaultLayout;
var DefaultExiting = function (startValues) {
    'worklet';
    return {
        initialValues: {
            originX: startValues.originX,
            originY: startValues.originY,
            width: startValues.width,
            height: startValues.height
        },
        animations: {}
    };
};
exports.DefaultExiting = DefaultExiting;
var Layout = /** @class */ (function () {
    function Layout() {
    }
    Layout.duration = function (r) {
        var instance = new Layout();
        return instance.duration(r);
    };
    Layout.prototype.duration = function (t) {
        this.durationV = t;
        return this;
    };
    Layout.easing = function (r) {
        var instance = new Layout();
        return instance.easing(r);
    };
    Layout.prototype.easing = function (e) {
        this.easingV = e;
        return this;
    };
    Layout.delay = function (r) {
        var instance = new Layout();
        return instance.delay(r);
    };
    Layout.prototype.delay = function (d) {
        this.delayV = d;
        return this;
    };
    Layout.prototype.rotate = function (v) {
        this.rotateV = v;
        return this;
    };
    Layout.springify = function () {
        var instance = new Layout();
        return instance.springify();
    };
    Layout.prototype.springify = function () {
        this.type = animations_1.withSpring;
        return this;
    };
    Layout.damping = function (r) {
        var instance = new Layout();
        return instance.damping(r);
    };
    Layout.prototype.damping = function (d) {
        this.dampingV = d;
        return this;
    };
    Layout.mass = function (r) {
        var instance = new Layout();
        return instance.mass(r);
    };
    Layout.prototype.mass = function (m) {
        this.massV = m;
        return this;
    };
    Layout.stiffness = function (r) {
        var instance = new Layout();
        return instance.stiffness(r);
    };
    Layout.prototype.stiffness = function (s) {
        this.stiffnessV = s;
        return this;
    };
    Layout.overshootClamping = function (r) {
        var instance = new Layout();
        return instance.overshootClamping(r);
    };
    Layout.prototype.overshootClamping = function (o) {
        this.overshootClampingV = o;
        return this;
    };
    Layout.restDisplacementThreshold = function (r) {
        var instance = new Layout();
        return instance.restDisplacementThreshold(r);
    };
    Layout.prototype.restDisplacementThreshold = function (r) {
        this.restDisplacementThresholdV = r;
        return this;
    };
    Layout.restSpeedThreshold = function (r) {
        var instance = new Layout();
        return instance.restSpeedThreshold(r);
    };
    Layout.prototype.restSpeedThreshold = function (r) {
        this.restSpeedThresholdV = r;
        return this;
    };
    Layout.build = function () {
        var instance = new Layout();
        return instance.build();
    };
    Layout.prototype.build = function () {
        var duration = this.durationV;
        var easing = this.easingV;
        var delay = this.delayV;
        var type = this.type ? this.type : animations_1.withTiming;
        var damping = this.dampingV;
        var mass = this.massV;
        var stiffness = this.stiffnessV;
        var overshootClamping = this.overshootClampingV;
        var restDisplacementThreshold = this.restDisplacementThresholdV;
        var restSpeedThreshold = this.restSpeedThresholdV;
        var delayFunction = delay
            ? animations_1.withDelay
            : function (_, animation) {
                'worklet';
                return animation;
            };
        var animation = type;
        var config = {};
        if (type === animations_1.withTiming) {
            if (easing) {
                config.easing = easing;
            }
            if (duration) {
                config.duration = duration;
            }
        }
        else {
            if (damping) {
                config.damping = damping;
            }
            if (mass) {
                config.mass = mass;
            }
            if (stiffness) {
                config.stiffness = stiffness;
            }
            if (overshootClamping) {
                config.overshootClamping = overshootClamping;
            }
            if (restDisplacementThreshold) {
                config.restDisplacementThreshold = restDisplacementThreshold;
            }
            if (restSpeedThreshold) {
                config.restSpeedThreshold = restSpeedThreshold;
            }
        }
        return function (values) {
            'worklet';
            return {
                initialValues: {
                    originX: values.boriginX,
                    originY: values.boriginY,
                    width: values.bwidth,
                    height: values.bheight
                },
                animations: {
                    originX: delayFunction(delay, animation(values.originX, config)),
                    originY: delayFunction(delay, animation(values.originY, config)),
                    width: delayFunction(delay, animation(values.width, config)),
                    height: delayFunction(delay, animation(values.height, config))
                }
            };
        };
    };
    return Layout;
}());
exports.Layout = Layout;
var BaseAnimationBuilder = /** @class */ (function () {
    function BaseAnimationBuilder() {
    }
    BaseAnimationBuilder.duration = function (r) {
        var instance = this.createInstance();
        return instance.duration(r);
    };
    BaseAnimationBuilder.prototype.duration = function (t) {
        this.durationV = t;
        return this;
    };
    BaseAnimationBuilder.easing = function (r) {
        var instance = this.createInstance();
        return instance.easing(r);
    };
    BaseAnimationBuilder.prototype.easing = function (e) {
        this.easingV = e;
        return this;
    };
    BaseAnimationBuilder.delay = function (r) {
        var instance = this.createInstance();
        return instance.delay(r);
    };
    BaseAnimationBuilder.prototype.delay = function (d) {
        this.delayV = d;
        return this;
    };
    BaseAnimationBuilder.prototype.rotate = function (v) {
        this.rotateV = v;
        return this;
    };
    BaseAnimationBuilder.springify = function () {
        var instance = this.createInstance();
        return instance.springify();
    };
    BaseAnimationBuilder.prototype.springify = function () {
        this.type = animations_1.withSpring;
        return this;
    };
    BaseAnimationBuilder.damping = function (r) {
        var instance = this.createInstance();
        return instance.damping(r);
    };
    BaseAnimationBuilder.prototype.damping = function (d) {
        this.dampingV = d;
        return this;
    };
    BaseAnimationBuilder.mass = function (r) {
        var instance = this.createInstance();
        return instance.mass(r);
    };
    BaseAnimationBuilder.prototype.mass = function (m) {
        this.massV = m;
        return this;
    };
    BaseAnimationBuilder.stiffness = function (r) {
        var instance = this.createInstance();
        return instance.stiffness(r);
    };
    BaseAnimationBuilder.prototype.stiffness = function (s) {
        this.stiffnessV = s;
        return this;
    };
    BaseAnimationBuilder.overshootClamping = function (r) {
        var instance = this.createInstance();
        return instance.overshootClamping(r);
    };
    BaseAnimationBuilder.prototype.overshootClamping = function (o) {
        this.overshootClampingV = o;
        return this;
    };
    BaseAnimationBuilder.restDisplacementThreshold = function (r) {
        var instance = this.createInstance();
        return instance.restDisplacementThreshold(r);
    };
    BaseAnimationBuilder.prototype.restDisplacementThreshold = function (r) {
        this.restDisplacementThresholdV = r;
        return this;
    };
    BaseAnimationBuilder.restSpeedThreshold = function (r) {
        var instance = this.createInstance();
        return instance.restSpeedThreshold(r);
    };
    BaseAnimationBuilder.prototype.restSpeedThreshold = function (r) {
        this.restSpeedThresholdV = r;
        return this;
    };
    BaseAnimationBuilder.build = function () {
        var instance = this.createInstance();
        return instance.build();
    };
    BaseAnimationBuilder.prototype.getDelayFunction = function () {
        var delay = this.delayV;
        return delay
            ? animations_1.withDelay
            : function (_, animation) {
                'worklet';
                return animation;
            };
    };
    BaseAnimationBuilder.prototype.getAnimationAndConfig = function () {
        var duration = this.durationV;
        var easing = this.easingV;
        var type = this.type ? this.type : animations_1.withTiming;
        var damping = this.dampingV;
        var mass = this.massV;
        var stiffness = this.stiffnessV;
        var overshootClamping = this.overshootClampingV;
        var restDisplacementThreshold = this.restDisplacementThresholdV;
        var restSpeedThreshold = this.restSpeedThresholdV;
        var animation = type;
        var config = {};
        if (type === animations_1.withTiming) {
            if (easing) {
                config.easing = easing;
            }
            if (duration) {
                config.duration = duration;
            }
        }
        else {
            if (damping) {
                config.damping = damping;
            }
            if (mass) {
                config.mass = mass;
            }
            if (stiffness) {
                config.stiffness = stiffness;
            }
            if (overshootClamping) {
                config.overshootClamping = overshootClamping;
            }
            if (restDisplacementThreshold) {
                config.restDisplacementThreshold = restDisplacementThreshold;
            }
            if (restSpeedThreshold) {
                config.restSpeedThreshold = restSpeedThreshold;
            }
        }
        return [animation, config];
    };
    return BaseAnimationBuilder;
}());
exports.BaseAnimationBuilder = BaseAnimationBuilder;
var BaseBounceAnimationBuilder = /** @class */ (function () {
    function BaseBounceAnimationBuilder() {
    }
    BaseBounceAnimationBuilder.duration = function (r) {
        var instance = this.createInstance();
        return instance.duration(r);
    };
    BaseBounceAnimationBuilder.prototype.duration = function (t) {
        this.durationV = t;
        return this;
    };
    BaseBounceAnimationBuilder.delay = function (r) {
        var instance = this.createInstance();
        return instance.delay(r);
    };
    BaseBounceAnimationBuilder.prototype.delay = function (d) {
        this.delayV = d;
        return this;
    };
    BaseBounceAnimationBuilder.prototype.getDelayFunction = function () {
        var delay = this.delayV;
        return delay
            ? animations_1.withDelay
            : function (_, animation) {
                'worklet';
                return animation;
            };
    };
    BaseBounceAnimationBuilder.prototype.getAnimationAndConfig = function () {
        var duration = this.durationV;
        var type = animations_1.withTiming;
        var animation = type;
        var config = {};
        if (easing) {
            config.easing = easing;
        }
        if (duration) {
            config.duration = duration;
        }
        return [animation, config];
    };
    return BaseBounceAnimationBuilder;
}());
exports.BaseBounceAnimationBuilder = BaseBounceAnimationBuilder;
