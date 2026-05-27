use oxc_ast::AstBuilder;
use oxc_ast::ast::Expression;
use oxc_span::SPAN;

/// Replaces `isWeb()` / `shouldBeUseWeb()` calls with `true`.
pub fn substitute_web_call_expression<'a>(node: &mut Expression<'a>, builder: AstBuilder<'a>) {
    let Expression::CallExpression(call) = node else {
        return;
    };

    let Expression::Identifier(callee) = &call.callee else {
        return;
    };

    let name = callee.name.as_str();
    if name == "isWeb" || name == "shouldBeUseWeb" {
        *node = builder.expression_boolean_literal(SPAN, true);
    }
}
