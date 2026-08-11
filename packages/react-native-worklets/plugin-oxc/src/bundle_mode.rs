use oxc_ast::AstBuilder;
use oxc_ast::ast::{AssignmentTarget, Expression, ExpressionStatement, Program};
use oxc_ast_visit::{VisitMut, walk_mut};
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

pub fn enable_flag<'a>(program: &mut Program<'a>, builder: AstBuilder<'a>, filename: &str) {
    if !is_toggle_target(filename) {
        return;
    }
    FlagEnabler { builder }.visit_program(program);
}

struct FlagEnabler<'a> {
    builder: AstBuilder<'a>,
}

impl<'a> VisitMut<'a> for FlagEnabler<'a> {
    fn visit_expression_statement(&mut self, statement: &mut ExpressionStatement<'a>) {
        walk_mut::walk_expression_statement(self, statement);

        let Expression::AssignmentExpression(assign) = &mut statement.expression else {
            return;
        };
        let AssignmentTarget::StaticMemberExpression(member) = &assign.left else {
            return;
        };
        let Expression::Identifier(object) = &member.object else {
            return;
        };
        if object.name.as_str() != "globalThis"
            || member.property.name.as_str() != "_WORKLETS_BUNDLE_MODE_ENABLED"
        {
            return;
        }
        assign.right = self.builder.expression_boolean_literal(SPAN, true);
    }
}
