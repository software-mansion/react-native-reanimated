use oxc_ast::ast::{Expression, Program};
use oxc_ast::AstBuilder;
use oxc_ast_visit::{walk_mut, VisitMut};
use oxc_span::SPAN;

use crate::type_assertions::TypeAssertions;

pub fn substitute_web_platform_checks<'a>(
    program: &mut Program<'a>,
    builder: AstBuilder<'a>,
    assertions: &TypeAssertions,
) {
    WebSubstitutionPass {
        builder,
        assertions,
    }
    .visit_program(program);
}

struct WebSubstitutionPass<'a, 'b> {
    builder: AstBuilder<'a>,
    assertions: &'b TypeAssertions,
}

impl<'a, 'b> VisitMut<'a> for WebSubstitutionPass<'a, 'b> {
    fn visit_expression(&mut self, expr: &mut Expression<'a>) {
        walk_mut::walk_expression(self, expr);

        let Expression::CallExpression(call) = expr else {
            return;
        };
        let Some(name) = self.assertions.identifier(&call.callee) else {
            return;
        };
        if name == "isWeb" || name == "shouldBeUseWeb" {
            *expr = self.builder.expression_boolean_literal(SPAN, true);
        }
    }
}
