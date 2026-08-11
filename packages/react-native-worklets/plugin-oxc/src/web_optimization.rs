use oxc_ast::AstBuilder;
use oxc_ast::ast::{Expression, Program};
use oxc_ast_visit::{VisitMut, walk_mut};
use oxc_span::SPAN;

/// Mirrors `substituteWebCallExpression` in `plugin/src/webOptimization.ts`.
pub fn substitute_web_platform_checks<'a>(program: &mut Program<'a>, builder: AstBuilder<'a>) {
    WebSubstitutionPass { builder }.visit_program(program);
}

struct WebSubstitutionPass<'a> {
    builder: AstBuilder<'a>,
}

impl<'a> VisitMut<'a> for WebSubstitutionPass<'a> {
    fn visit_expression(&mut self, expr: &mut Expression<'a>) {
        walk_mut::walk_expression(self, expr);

        let Expression::CallExpression(call) = expr else {
            return;
        };
        let Expression::Identifier(callee) = &call.callee else {
            return;
        };
        let name = callee.name.as_str();
        if name == "isWeb" || name == "shouldBeUseWeb" {
            *expr = self.builder.expression_boolean_literal(SPAN, true);
        }
    }
}
