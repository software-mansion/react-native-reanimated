use oxc_ast::AstBuilder;
use oxc_ast::ast::{AssignmentTarget, Expression, ExpressionStatement};
use oxc_span::SPAN;

use crate::state::State;

const WORKLETS_SRC_ENTRY: &str = "react-native-worklets/src/index.ts";
const WORKLETS_LIB_ENTRY: &str = "react-native-worklets/lib/module/index.js";

/// Replaces `globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;` with `... = true;`
/// in the Worklets entry-point file when `bundleMode` is enabled.
pub fn toggle_bundle_mode<'a>(
    node: &mut ExpressionStatement<'a>,
    state: &State,
    filename: &str,
    builder: AstBuilder<'a>,
) {
    if !state.opts.bundle_mode.unwrap_or(false) {
        return;
    }
    let normalized = filename.replace('\\', "/");
    if !normalized.ends_with(WORKLETS_SRC_ENTRY) && !normalized.ends_with(WORKLETS_LIB_ENTRY) {
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
