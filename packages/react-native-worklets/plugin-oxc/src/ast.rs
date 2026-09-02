use oxc_allocator::TakeIn;
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    AssignmentTarget, CallExpression, Expression, FunctionBody, IdentifierReference,
    ObjectExpression, Statement, VariableDeclarationKind,
};
use oxc_span::SPAN;

pub fn const_decl<'a>(
    builder: AstBuilder<'a>,
    pattern: oxc_ast::ast::BindingPattern<'a>,
    init: Expression<'a>,
) -> Statement<'a> {
    Statement::VariableDeclaration(const_declaration(builder, pattern, init))
}

pub fn const_declaration<'a>(
    builder: AstBuilder<'a>,
    pattern: oxc_ast::ast::BindingPattern<'a>,
    init: Expression<'a>,
) -> oxc_allocator::Box<'a, oxc_ast::ast::VariableDeclaration<'a>> {
    let declarator = builder.variable_declarator(
        SPAN,
        VariableDeclarationKind::Const,
        pattern,
        NONE,
        Some(init),
        false,
    );
    let declarations = builder.vec1(declarator);
    builder.alloc_variable_declaration(SPAN, VariableDeclarationKind::Const, declarations, false)
}

pub fn identifier_binding_pattern<'a>(
    builder: AstBuilder<'a>,
    name: &str,
) -> oxc_ast::ast::BindingPattern<'a> {
    builder.binding_pattern_binding_identifier(SPAN, builder.ident(name))
}

pub fn closure_binding_pattern<'a>(
    builder: AstBuilder<'a>,
    closure_variables: &[String],
) -> oxc_ast::ast::BindingPattern<'a> {
    let mut properties = builder.vec_with_capacity(closure_variables.len());
    for name in closure_variables {
        let ident = builder.ident(name);
        properties.push(builder.binding_property(
            SPAN,
            oxc_ast::ast::PropertyKey::StaticIdentifier(builder.alloc_identifier_name(SPAN, ident)),
            builder.binding_pattern_binding_identifier(SPAN, ident),
            true,
            false,
        ));
    }
    builder.binding_pattern_object_pattern(SPAN, properties, NONE)
}

pub fn is_object_method(prop: &oxc_ast::ast::ObjectProperty<'_>) -> bool {
    prop.method || prop.kind.is_accessor()
}

pub fn replace_implicit_return_with_block<'a>(
    body: &mut FunctionBody<'a>,
    builder: AstBuilder<'a>,
) {
    if body.statements.len() != 1 {
        return;
    }
    let Some(stmt) = body.statements.first_mut() else {
        return;
    };
    if let Statement::ExpressionStatement(es) = stmt {
        let expr = es.expression.take_in(builder);
        *stmt = builder.statement_return(SPAN, Some(expr));
    }
}

pub fn identifier_name<'a>(expr: &Expression<'a>) -> Option<&'a str> {
    match expr {
        Expression::Identifier(id) => Some(id.name.as_str()),
        _ => None,
    }
}

pub fn call_expression<'e, 'a>(expr: &'e Expression<'a>) -> Option<&'e CallExpression<'a>> {
    match expr {
        Expression::CallExpression(call) => Some(call),
        _ => None,
    }
}

pub fn object_expression<'e, 'a>(expr: &'e Expression<'a>) -> Option<&'e ObjectExpression<'a>> {
    match expr {
        Expression::ObjectExpression(object) => Some(object),
        _ => None,
    }
}

pub fn member_property<'e, 'a>(expr: &'e Expression<'a>) -> Option<(&'e Expression<'a>, &'a str)> {
    match expr {
        Expression::StaticMemberExpression(member) => {
            Some((&member.object, member.property.name.as_str()))
        }
        Expression::ComputedMemberExpression(member) => {
            identifier_name(&member.expression).map(|name| (&member.object, name))
        }
        _ => None,
    }
}

pub fn member_object<'e, 'a>(expr: &'e Expression<'a>) -> Option<&'e Expression<'a>> {
    expr.as_member_expression().map(|member| member.object())
}

pub fn assignment_identifier<'e, 'a>(
    target: &'e AssignmentTarget<'a>,
) -> Option<&'e IdentifierReference<'a>> {
    match target {
        AssignmentTarget::AssignmentTargetIdentifier(id) => Some(id),
        _ => None,
    }
}
