use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    AssignmentOperator, AssignmentTarget, Expression, FormalParameterKind, FormalParameters,
    FunctionBody, FunctionType, NumberBase, Statement,
};
use oxc_span::SPAN;
use oxc_syntax::reference::ReferenceId;

use crate::ast::replace_implicit_return_with_block;
use crate::ast::{closure_binding_pattern, const_decl, identifier_binding_pattern};
use crate::directives::strip_worklet_directives;
use crate::naming::WorkletNames;
use crate::types::State;
use crate::version::plugin_version;
use crate::worklet_factory::WorkletInput;

pub fn build_factory_expression<'a>(
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    names: &WorkletNames,
    input: &WorkletInput<'a, '_>,
    closure_variables: &[String],
    worklet_hash: u64,
    state: &State,
) -> Expression<'a> {
    let react_name = names.react_name.as_str();
    let pat = closure_binding_pattern(builder, closure_variables);
    let factory_param = builder.plain_formal_parameter(SPAN, pat);
    let params_vec = if closure_variables.is_empty() {
        builder.vec()
    } else {
        builder.vec1(factory_param)
    };
    let factory_params =
        builder.formal_parameters(SPAN, FormalParameterKind::FormalParameter, params_vec, NONE);

    let mut statements = builder.vec_with_capacity(8);

    statements.push(build_inner_fn_decl(builder, allocator, react_name, input));

    if !closure_variables.is_empty() {
        statements.push(build_member_assign(
            builder,
            react_name,
            "__closure",
            build_closure_array(
                builder,
                closure_variables.iter().map(|name| (name.as_str(), None)),
            ),
        ));
    }

    statements.push(build_member_assign(
        builder,
        react_name,
        "__workletHash",
        builder.expression_numeric_literal(SPAN, worklet_hash as f64, None, NumberBase::Decimal),
    ));

    if let Some(version) = plugin_version(state) {
        let version_str = builder.str(version);
        statements.push(build_member_assign(
            builder,
            react_name,
            "__pluginVersion",
            builder.expression_string_literal(SPAN, version_str, None),
        ));
    }

    statements.push(builder.statement_return(
        SPAN,
        Some(builder.expression_identifier(SPAN, builder.ident(react_name))),
    ));

    let factory_body = builder.function_body(SPAN, builder.vec(), statements);

    let factory_id_name = builder.ident(&names.factory_name);
    let factory_id = builder.binding_identifier(SPAN, factory_id_name);

    Expression::FunctionExpression(builder.alloc_function(
        SPAN,
        FunctionType::FunctionExpression,
        Some(factory_id),
        false,
        false,
        false,
        NONE,
        NONE,
        factory_params,
        NONE,
        Some(factory_body),
    ))
}

fn build_inner_fn_decl<'a>(
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    react_name: &str,
    input: &WorkletInput<'a, '_>,
) -> Statement<'a> {
    let params_clone: FormalParameters<'a> = input.params.clone_in(allocator);
    let mut body_clone: FunctionBody<'a> = input.body.clone_in(allocator);
    strip_worklet_directives(&mut body_clone, builder, true);
    if input.is_expression_body {
        replace_implicit_return_with_block(&mut body_clone, builder);
    }

    let init = Expression::FunctionExpression(builder.alloc_function(
        SPAN,
        FunctionType::FunctionExpression,
        None,
        input.is_generator,
        input.is_async,
        false,
        NONE,
        NONE,
        params_clone,
        NONE,
        Some(body_clone),
    ));

    let id_pat = identifier_binding_pattern(builder, react_name);
    const_decl(builder, id_pat, init)
}

fn build_member_assign<'a>(
    builder: AstBuilder<'a>,
    object_name: &str,
    member_name: &str,
    value: Expression<'a>,
) -> Statement<'a> {
    let target = AssignmentTarget::from(builder.member_expression_static(
        SPAN,
        builder.expression_identifier(SPAN, builder.ident(object_name)),
        builder.identifier_name(SPAN, builder.ident(member_name)),
        false,
    ));
    let assign = builder.expression_assignment(SPAN, AssignmentOperator::Assign, target, value);
    builder.statement_expression(SPAN, assign)
}

pub fn build_closure_array<'a, 'n>(
    builder: AstBuilder<'a>,
    entries: impl ExactSizeIterator<Item = (&'n str, Option<ReferenceId>)>,
) -> Expression<'a> {
    let mut elements = builder.vec_with_capacity(entries.len());
    for (name, reference_id) in entries {
        let ident = builder.ident(name);
        let value = match reference_id {
            Some(reference_id) => {
                builder.expression_identifier_with_reference_id(SPAN, ident, reference_id)
            }
            None => builder.expression_identifier(SPAN, ident),
        };
        elements.push(oxc_ast::ast::ArrayExpressionElement::from(value));
    }
    builder.expression_array(SPAN, elements)
}
