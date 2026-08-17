use oxc_ast::ast::Expression;

use crate::type_assertions::TypeAssertions;

const MAX_CHAIN_DEPTH: u32 = 64;

#[rustfmt::skip]
const GESTURE_HANDLER_GESTURE_OBJECTS: &[&str] = &[
    "Tap", "Pan", "Pinch", "Rotation", "Fling", "LongPress", "ForceTouch", "Native", "Manual",
    "Race", "Simultaneous", "Exclusive", "Hover",
];

#[rustfmt::skip]
const GESTURE_HANDLER_BUILDER_METHODS: &[&str] = &[
    "onBegin",
    "onStart",
    "onEnd",
    "onFinalize",
    "onUpdate",
    "onChange",
    "onTouchesDown",
    "onTouchesMove",
    "onTouchesUp",
    "onTouchesCancelled",
];

#[rustfmt::skip]
pub const GESTURE_HANDLER_OBJECT_HOOKS: &[&str] = &[
    "useTapGesture",
    "usePanGesture",
    "usePinchGesture",
    "useRotationGesture",
    "useFlingGesture",
    "useLongPressGesture",
    "useNativeGesture",
    "useManualGesture",
    "useHoverGesture",
];

#[rustfmt::skip]
const LAYOUT_ANIMATIONS: &[&str] = &[
    "BounceIn", "BounceInDown", "BounceInLeft", "BounceInRight", "BounceInUp", "BounceOut",
    "BounceOutDown", "BounceOutLeft", "BounceOutRight", "BounceOutUp", "FadeIn", "FadeInDown",
    "FadeInLeft", "FadeInRight", "FadeInUp", "FadeOut", "FadeOutDown", "FadeOutLeft",
    "FadeOutRight", "FadeOutUp", "FlipInEasyX", "FlipInEasyY", "FlipInXDown", "FlipInXUp",
    "FlipInYLeft", "FlipInYRight", "FlipOutEasyX", "FlipOutEasyY", "FlipOutXDown", "FlipOutXUp",
    "FlipOutYLeft", "FlipOutYRight", "LightSpeedInLeft", "LightSpeedInRight", "LightSpeedOutLeft",
    "LightSpeedOutRight", "PinwheelIn", "PinwheelOut", "RollInLeft", "RollInRight", "RollOutLeft",
    "RollOutRight", "RotateInDownLeft", "RotateInDownRight", "RotateInUpLeft", "RotateInUpRight",
    "RotateOutDownLeft", "RotateOutDownRight", "RotateOutUpLeft", "RotateOutUpRight",
    "SlideInDown", "SlideInLeft", "SlideInRight", "SlideInUp", "SlideOutDown", "SlideOutLeft",
    "SlideOutRight", "SlideOutUp", "StretchInX", "StretchInY", "StretchOutX", "StretchOutY",
    "ZoomIn", "ZoomInDown", "ZoomInEasyDown", "ZoomInEasyUp", "ZoomInLeft", "ZoomInRight",
    "ZoomInRotate", "ZoomInUp", "ZoomOut", "ZoomOutDown", "ZoomOutEasyDown", "ZoomOutEasyUp",
    "ZoomOutLeft", "ZoomOutRight", "ZoomOutRotate", "ZoomOutUp",
    "Layout",
    "LinearTransition",
    "SequencedTransition",
    "FadingTransition",
    "JumpingTransition",
    "CurvedTransition",
    "EntryExitTransition",
];

#[rustfmt::skip]
const LAYOUT_ANIMATION_CHAIN_METHODS: &[&str] = &[
    "build",
    "duration",
    "delay",
    "getDuration",
    "randomDelay",
    "getDelay",
    "getDelayFunction",
    "easing",
    "rotate",
    "springify",
    "damping",
    "mass",
    "stiffness",
    "overshootClamping",
    "energyThreshold",
    "restDisplacementThreshold",
    "restSpeedThreshold",
    "withInitialValues",
    "getAnimationAndConfig",
    "easingX",
    "easingY",
    "easingWidth",
    "easingHeight",
    "entering",
    "exiting",
    "reverse",
];

const LAYOUT_ANIMATION_CALLBACKS: &[&str] = &["withCallback"];

pub fn is_gesture_object_event_callback_method(
    callee: &Expression<'_>,
    assertions: &TypeAssertions,
) -> bool {
    let Some((object, name)) = assertions.member_property(callee) else {
        return false;
    };
    if !GESTURE_HANDLER_BUILDER_METHODS.contains(&name) {
        return false;
    }
    contains_gesture_object(object, MAX_CHAIN_DEPTH, assertions)
}

fn contains_gesture_object(expr: &Expression<'_>, depth: u32, assertions: &TypeAssertions) -> bool {
    if depth == 0 {
        return false;
    }
    if is_gesture_object(expr, assertions) {
        return true;
    }
    if let Some(call) = assertions.call(expr) {
        if let Some(object) = assertions.member_object(&call.callee) {
            if contains_gesture_object(object, depth - 1, assertions) {
                return true;
            }
        }
    }
    false
}

fn is_gesture_object(expr: &Expression<'_>, assertions: &TypeAssertions) -> bool {
    let Some(call) = assertions.call(expr) else {
        return false;
    };
    let Some((object, name)) = assertions.member_property(&call.callee) else {
        return false;
    };
    assertions.identifier(object) == Some("Gesture")
        && GESTURE_HANDLER_GESTURE_OBJECTS.contains(&name)
}

pub fn is_layout_animation_callback_method(
    callee: &Expression<'_>,
    assertions: &TypeAssertions,
) -> bool {
    let Some((object, name)) = assertions.member_property(callee) else {
        return false;
    };
    if !LAYOUT_ANIMATION_CALLBACKS.contains(&name) {
        return false;
    }
    is_layout_animation_chainable_or_new(object, MAX_CHAIN_DEPTH, assertions)
}

fn is_layout_animation_chainable_or_new(
    expr: &Expression<'_>,
    depth: u32,
    assertions: &TypeAssertions,
) -> bool {
    if depth == 0 || assertions.hides(expr) {
        return false;
    }
    if let Some(name) = assertions.identifier(expr) {
        return LAYOUT_ANIMATIONS.contains(&name);
    }
    if let Expression::NewExpression(new_expr) = expr {
        return assertions
            .identifier(&new_expr.callee)
            .is_some_and(|name| LAYOUT_ANIMATIONS.contains(&name));
    }
    if let Some(call) = assertions.call(expr) {
        if let Some((object, name)) = assertions.member_property(&call.callee) {
            if LAYOUT_ANIMATION_CHAIN_METHODS.contains(&name) {
                return is_layout_animation_chainable_or_new(object, depth - 1, assertions);
            }
        }
    }
    false
}
