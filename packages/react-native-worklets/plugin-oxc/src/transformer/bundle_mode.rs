use oxc_ast::AstBuilder;
use oxc_ast::ast::{AssignmentTarget, Expression, ExpressionStatement};
use oxc_span::SPAN;

const TOGGLE_PATHS: &[&str] = &[
    "react-native-worklets/src/index.ts",
    "react-native-worklets/src/debug/bundleMode.native.ts",
    "react-native-worklets/lib/module/index.js",
    "react-native-worklets/lib/module/debug/bundleMode.native.js",
];

pub fn is_toggle_target(filename: &str) -> bool {
    TOGGLE_PATHS.iter().any(|path| filename.ends_with(path))
}

pub fn toggle_bundle_mode<'a>(
    node: &mut ExpressionStatement<'a>,
    builder: AstBuilder<'a>,
) {
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
