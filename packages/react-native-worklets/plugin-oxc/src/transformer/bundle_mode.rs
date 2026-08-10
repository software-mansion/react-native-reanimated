use oxc_ast::AstBuilder;
use oxc_ast::ast::{AssignmentTarget, Expression, ExpressionStatement};
use oxc_span::SPAN;

use crate::state::State;

const TOGGLE_PATHS: &[&str] = &[
    "react-native-worklets/src/index.ts",
    "react-native-worklets/src/debug/bundleMode.native.ts",
    "react-native-worklets/lib/module/index.js",
    "react-native-worklets/lib/module/debug/bundleMode.native.js",
];

/// Replaces `globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;` with `... = true;`
/// in the Worklets toggle-target files. Bundle mode is the only mode this plugin
/// supports — the toggle exists so the runtime side sees the flag set
/// regardless of which entry-point variant was bundled.
pub fn toggle_bundle_mode<'a>(
    node: &mut ExpressionStatement<'a>,
    _state: &State,
    filename: &str,
    builder: AstBuilder<'a>,
) {
    let normalized = filename.replace('\\', "/");
    if !TOGGLE_PATHS.iter().any(|path| normalized.ends_with(path)) {
        return;
    }

    let Expression::AssignmentExpression(assign) = &mut node.expression else {
        return;
    };

    let AssignmentTarget::StaticMemberExpression(member) = &assign.left else {
        return;
    };

    let Expression::Identifier(object) = &member.object else {
        return;
    };
    if object.name.as_str() != "globalThis" {
        return;
    }
    if member.property.name.as_str() != "_WORKLETS_BUNDLE_MODE_ENABLED" {
        return;
    }

    assign.right = builder.expression_boolean_literal(SPAN, true);
}
