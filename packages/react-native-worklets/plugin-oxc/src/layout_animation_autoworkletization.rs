use crate::ast::{call_expression, identifier_name, member_property};

use oxc_ast::ast::Expression;

const MAX_CHAIN_DEPTH: u32 = 64;

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

pub const LAYOUT_ANIMATION_CALLBACKS: &[&str] = &["withCallback"];

pub fn is_layout_animation_callback_method(callee: &Expression<'_>) -> bool {
    let Some((object, name)) = member_property(callee) else {
        return false;
    };
    if !LAYOUT_ANIMATION_CALLBACKS.contains(&name) {
        return false;
    }
    is_layout_animation_chainable_or_new(object, MAX_CHAIN_DEPTH)
}

fn is_layout_animation_chainable_or_new(expr: &Expression<'_>, depth: u32) -> bool {
    if depth == 0 {
        return false;
    }
    if let Some(name) = identifier_name(expr) {
        return LAYOUT_ANIMATIONS.contains(&name);
    }
    if let Expression::NewExpression(new_expr) = expr {
        return identifier_name(&new_expr.callee)
            .is_some_and(|name| LAYOUT_ANIMATIONS.contains(&name));
    }
    if let Some(call) = call_expression(expr)
        && let Some((object, name)) = member_property(&call.callee)
        && LAYOUT_ANIMATION_CHAIN_METHODS.contains(&name)
    {
        return is_layout_animation_chainable_or_new(object, depth - 1);
    }
    false
}
