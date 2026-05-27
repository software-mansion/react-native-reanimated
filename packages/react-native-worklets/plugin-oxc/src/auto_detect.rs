use oxc_ast::ast::Expression;

/// Cap on chain-walking recursion in `contains_gesture_object` and
/// `is_layout_animation_chainable_or_new`. Real-world animation/gesture chains
/// stay well under this; anything longer is more likely to be a pathological
/// input than legitimate code we should auto-workletize.
const MAX_CHAIN_DEPTH: u32 = 64;

const GESTURE_HANDLER_GESTURE_OBJECTS: &[&str] = &[
    "Tap", "Pan", "Pinch", "Rotation", "Fling", "LongPress", "ForceTouch", "Native", "Manual",
    "Race", "Simultaneous", "Exclusive", "Hover",
];

pub const GESTURE_HANDLER_BUILDER_METHODS: &[&str] = &[
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

const ENTRY_EXIT_ANIMATIONS: &[&str] = &[
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
];

const LAYOUT_TRANSITIONS: &[&str] = &[
    "Layout",
    "LinearTransition",
    "SequencedTransition",
    "FadingTransition",
    "JumpingTransition",
    "CurvedTransition",
    "EntryExitTransition",
];

const BASE_ANIMATION_CHAIN_METHODS: &[&str] = &[
    "build",
    "duration",
    "delay",
    "getDuration",
    "randomDelay",
    "getDelay",
    "getDelayFunction",
];

const COMPLEX_ANIMATION_CHAIN_METHODS: &[&str] = &[
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
];

const DEFAULT_TRANSITION_CHAIN_METHODS: &[&str] = &[
    "easingX",
    "easingY",
    "easingWidth",
    "easingHeight",
    "entering",
    "exiting",
    "reverse",
];

const LAYOUT_ANIMATION_CALLBACKS: &[&str] = &["withCallback"];

/// Matches `Gesture.X()[*].onY` as a CallExpression callee, where Y is a
/// gesture-handler builder method (onStart, onEnd, …) and the object trail
/// contains a `Gesture.<TapKind>()` somewhere.
pub fn is_gesture_object_event_callback_method(callee: &Expression<'_>) -> bool {
    let Expression::StaticMemberExpression(member) = callee else {
        return false;
    };
    let name = member.property.name.as_str();
    if !GESTURE_HANDLER_BUILDER_METHODS.contains(&name) {
        return false;
    }
    contains_gesture_object(&member.object, MAX_CHAIN_DEPTH)
}

fn contains_gesture_object(expr: &Expression<'_>, depth: u32) -> bool {
    if depth == 0 {
        return false;
    }
    if is_gesture_object(expr) {
        return true;
    }
    if let Expression::CallExpression(call) = expr {
        if let Expression::StaticMemberExpression(member) = &call.callee {
            if contains_gesture_object(&member.object, depth - 1) {
                return true;
            }
        }
    }
    false
}

fn is_gesture_object(expr: &Expression<'_>) -> bool {
    let Expression::CallExpression(call) = expr else {
        return false;
    };
    let Expression::StaticMemberExpression(member) = &call.callee else {
        return false;
    };
    let Expression::Identifier(obj) = &member.object else {
        return false;
    };
    obj.name.as_str() == "Gesture"
        && GESTURE_HANDLER_GESTURE_OBJECTS.contains(&member.property.name.as_str())
}

/// Matches `<chainable>.withCallback` where `<chainable>` resolves up to a
/// `BounceIn` / `FadeIn` / `LinearTransition` / etc identifier or
/// `new <LayoutTransition>()`.
pub fn is_layout_animation_callback_method(callee: &Expression<'_>) -> bool {
    let Expression::StaticMemberExpression(member) = callee else {
        return false;
    };
    if !LAYOUT_ANIMATION_CALLBACKS.contains(&member.property.name.as_str()) {
        return false;
    }
    is_layout_animation_chainable_or_new(&member.object, MAX_CHAIN_DEPTH)
}

fn is_layout_animation_chainable_or_new(expr: &Expression<'_>, depth: u32) -> bool {
    if depth == 0 {
        return false;
    }
    match expr {
        Expression::Identifier(id) => {
            let n = id.name.as_str();
            ENTRY_EXIT_ANIMATIONS.contains(&n) || LAYOUT_TRANSITIONS.contains(&n)
        }
        Expression::NewExpression(new_expr) => {
            if let Expression::Identifier(id) = &new_expr.callee {
                let n = id.name.as_str();
                return ENTRY_EXIT_ANIMATIONS.contains(&n) || LAYOUT_TRANSITIONS.contains(&n);
            }
            false
        }
        Expression::CallExpression(call) => {
            if let Expression::StaticMemberExpression(member) = &call.callee {
                let n = member.property.name.as_str();
                let valid_method = BASE_ANIMATION_CHAIN_METHODS.contains(&n)
                    || COMPLEX_ANIMATION_CHAIN_METHODS.contains(&n)
                    || DEFAULT_TRANSITION_CHAIN_METHODS.contains(&n);
                if valid_method {
                    return is_layout_animation_chainable_or_new(&member.object, depth - 1);
                }
            }
            false
        }
        _ => false,
    }
}
