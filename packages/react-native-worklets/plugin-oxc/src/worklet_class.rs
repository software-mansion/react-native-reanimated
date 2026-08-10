
use oxc_allocator::CloneIn;
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    AssignmentOperator, AssignmentTarget, Class, ClassBody, ClassElement, Expression,
    FormalParameterKind, FunctionType, PropertyKey, Statement, VariableDeclarationKind,
};
use oxc_span::SPAN;

pub const WORKLET_CLASS_MARKER: &str = "__workletClass";
const CLASS_FACTORY_SUFFIX: &str = "__classFactory";

pub fn is_worklet_class(class: &Class<'_>) -> bool {
    class.body.body.iter().any(|el| {
        if let ClassElement::PropertyDefinition(prop) = el {
            if let PropertyKey::StaticIdentifier(id) = &prop.key {
                return id.name.as_str() == WORKLET_CLASS_MARKER;
            }
        }
        false
    })
}

pub fn remove_worklet_class_marker<'a>(body: &mut ClassBody<'a>, builder: AstBuilder<'a>) {
    let kept: Vec<_> = body
        .body
        .drain(..)
        .filter(|el| match el {
            ClassElement::PropertyDefinition(prop) => match &prop.key {
                PropertyKey::StaticIdentifier(id) => id.name.as_str() != WORKLET_CLASS_MARKER,
                _ => true,
            },
            _ => true,
        })
        .collect();
    let mut new_body = builder.vec_with_capacity(kept.len());
    for el in kept {
        new_body.push(el);
    }
    body.body = new_body;
}

// Retained for re-enabling worklet classes in Bundle Mode; `class.ts`
// bails out on `state.opts.bundleMode` today, so nothing calls this yet.
#[allow(dead_code)]
pub fn build_class_factory_pair<'a>(
    class: &mut Class<'a>,
    class_name: &str,
    builder: AstBuilder<'a>,
    allocator: &'a oxc_allocator::Allocator,
) -> Option<(Statement<'a>, Statement<'a>)> {
    remove_worklet_class_marker(&mut class.body, builder);

    let factory_name = format!("{class_name}{CLASS_FACTORY_SUFFIX}");

    let cloned_class = class.clone_in(allocator);

    let class_expr = Expression::ClassExpression(builder.alloc(cloned_class));
    let id_pat = builder.binding_pattern_binding_identifier(SPAN, builder.ident(class_name));
    let decl = builder.variable_declarator(
        SPAN,
        VariableDeclarationKind::Const,
        id_pat,
        NONE,
        Some(class_expr),
        false,
    );
    let mut decls = builder.vec_with_capacity(1);
    decls.push(decl);
    let inner_const = Statement::VariableDeclaration(
        builder.alloc_variable_declaration(SPAN, VariableDeclarationKind::Const, decls, false),
    );

    let assign_target = AssignmentTarget::from(builder.member_expression_static(
        SPAN,
        builder.expression_identifier(SPAN, builder.ident(class_name)),
        builder.identifier_name(SPAN, builder.ident(&factory_name)),
        false,
    ));
    let assign_val = builder.expression_identifier(SPAN, builder.ident(&factory_name));
    let assign_stmt = builder.statement_expression(
        SPAN,
        builder.expression_assignment(SPAN, AssignmentOperator::Assign, assign_target, assign_val),
    );

    let return_stmt = builder.statement_return(
        SPAN,
        Some(builder.expression_identifier(SPAN, builder.ident(class_name))),
    );

    let dir_str = builder.str("worklet");
    let directive = builder.directive(
        SPAN,
        builder.string_literal(SPAN, dir_str, None),
        dir_str,
    );
    let mut directives = builder.vec_with_capacity(1);
    directives.push(directive);

    let mut body_stmts = builder.vec_with_capacity(3);
    body_stmts.push(inner_const);
    body_stmts.push(assign_stmt);
    body_stmts.push(return_stmt);
    let body = builder.function_body(SPAN, directives, body_stmts);

    let params = builder.formal_parameters(
        SPAN,
        FormalParameterKind::FormalParameter,
        builder.vec(),
        NONE,
    );

    let factory_id = builder.binding_identifier(SPAN, builder.ident(&factory_name));
    let factory_decl = Statement::FunctionDeclaration(builder.alloc_function(
        SPAN,
        FunctionType::FunctionDeclaration,
        Some(factory_id),
        false,
        false,
        false,
        NONE,
        NONE,
        params,
        NONE,
        Some(body),
    ));

    let call = builder.expression_call(
        SPAN,
        builder.expression_identifier(SPAN, builder.ident(&factory_name)),
        NONE,
        builder.vec(),
        false,
    );
    let id_pat2 = builder.binding_pattern_binding_identifier(SPAN, builder.ident(class_name));
    let decl2 = builder.variable_declarator(
        SPAN,
        VariableDeclarationKind::Const,
        id_pat2,
        NONE,
        Some(call),
        false,
    );
    let mut decls2 = builder.vec_with_capacity(1);
    decls2.push(decl2);
    let const_decl = Statement::VariableDeclaration(
        builder.alloc_variable_declaration(SPAN, VariableDeclarationKind::Const, decls2, false),
    );

    Some((factory_decl, const_decl))
}
