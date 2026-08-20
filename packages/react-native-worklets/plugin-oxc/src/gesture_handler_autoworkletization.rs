use oxc_ast::ast::Expression;

use crate::utils::{call_expression, identifier_name, member_object, member_property};

const MAX_CHAIN_DEPTH: u32 = 64;

#[rustfmt::skip]
const GESTURE_HANDLER_GESTURE_OBJECTS: &[&str] = &[
    "Tap", "Pan", "Pinch", "Rotation", "Fling", "LongPress", "ForceTouch", "Native", "Manual",
    "Race", "Simultaneous", "Exclusive", "Hover",
];

#[rustfmt::skip]
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

// Auto-workletizes React Native Gesture Handler callback functions.
// Detects `Gesture.Tap().onEnd(<fun>)` or similar, but skips `something.onEnd(<fun>)`.
// Supports method chaining as well, e.g. `Gesture.Tap().onStart(<fun1>).onUpdate(<fun2>).onEnd(<fun3>)`.
pub fn is_gesture_object_event_callback_method(callee: &Expression<'_>) -> bool {
    // Checks if node matches the pattern `Gesture.Foo()[*].onBar`
    // where `[*]` represents any number of method calls.
    let Some((object, name)) = member_property(callee) else {
        return false;
    };
    if !GESTURE_HANDLER_BUILDER_METHODS.contains(&name) {
        return false;
    }
    contains_gesture_object(object, MAX_CHAIN_DEPTH)
}

fn contains_gesture_object(expr: &Expression<'_>, depth: u32) -> bool {
    // Checks if node matches the pattern `Gesture.Foo()[*]`
    // where `[*]` represents any number of chained method calls, like `.something(42)`.
    if depth == 0 {
        return false;
    }
    if is_gesture_object(expr) {
        return true;
    }
    if let Some(call) = call_expression(expr) {
        if let Some(object) = member_object(&call.callee) {
            if contains_gesture_object(object, depth - 1) {
                return true;
            }
        }
    }
    false
}

fn is_gesture_object(expr: &Expression<'_>) -> bool {
    // Checks if node matches `Gesture.Tap()` or similar.
    let Some(call) = call_expression(expr) else {
        return false;
    };
    let Some((object, name)) = member_property(&call.callee) else {
        return false;
    };
    identifier_name(object) == Some("Gesture") && GESTURE_HANDLER_GESTURE_OBJECTS.contains(&name)
}
