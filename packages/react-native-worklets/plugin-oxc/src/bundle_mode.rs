use oxc_ast::ast::{AssignmentTarget, Expression, Program, Statement};
use oxc_ast::AstBuilder;
use oxc_span::SPAN;

use crate::utils::identifier_name;

const FLAG: &str = "_WORKLETS_BUNDLE_MODE_ENABLED";

const TOGGLE_PATHS: &[&str] = &[
    "react-native-worklets/src/index.ts",
    "react-native-worklets/src/debug/bundleMode.native.ts",
    "react-native-worklets/lib/module/index.js",
    "react-native-worklets/lib/module/debug/bundleMode.native.js",
];

pub fn enable_flag<'a>(program: &mut Program<'a>, builder: AstBuilder<'a>, filename: &str) -> bool {
    if !is_toggle_target(filename) {
        return false;
    }

    let mut enabled = false;
    for statement in program.body.iter_mut() {
        let Statement::ExpressionStatement(statement) = statement else {
            continue;
        };
        let Expression::AssignmentExpression(assign) = &mut statement.expression else {
            continue;
        };
        let AssignmentTarget::StaticMemberExpression(member) = &assign.left else {
            continue;
        };
        if identifier_name(&member.object) != Some("globalThis")
            || member.property.name.as_str() != FLAG
        {
            continue;
        }
        assign.right = builder.expression_boolean_literal(SPAN, true);
        enabled = true;
    }
    enabled
}

fn is_toggle_target(filename: &str) -> bool {
    TOGGLE_PATHS.iter().any(|path| filename.ends_with(path))
}
