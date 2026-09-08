use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    AssignmentOperator, AssignmentTarget, Expression, FormalParameterKind, FormalParameters,
    FunctionBody, FunctionType, NumberBase, PropertyKey, PropertyKind, Statement,
};
use oxc_semantic::Scoping;
use oxc_span::SPAN;
use oxc_syntax::reference::ReferenceId;
use oxc_syntax::scope::ScopeId;

use crate::ast::replace_implicit_return_with_block;
use crate::ast::{closure_binding_pattern, const_decl, identifier_binding_pattern};
use crate::closure::scope_is_inside;
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
    let (worklet_name, react_name) = (names.worklet_name.as_str(), names.react_name.as_str());
    let pat = closure_binding_pattern(builder, closure_variables);
    let factory_param = builder.plain_formal_parameter(SPAN, pat);
    let params_vec = builder.vec1(factory_param);
    let factory_params =
        builder.formal_parameters(SPAN, FormalParameterKind::FormalParameter, params_vec, NONE);

    let mut statements = builder.vec_with_capacity(8);

    statements.push(build_inner_fn_decl(builder, allocator, react_name, input));

    statements.push(build_member_assign(
        builder,
        react_name,
        "__closure",
        build_closure_object(
            builder,
            closure_variables.iter().map(|name| (name.as_str(), None)),
        ),
    ));

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

    let factory_id_name = builder.ident(&format!("{worklet_name}Factory"));
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

pub fn build_closure_object<'a, 'n>(
    builder: AstBuilder<'a>,
    entries: impl ExactSizeIterator<Item = (&'n str, Option<ReferenceId>)>,
) -> Expression<'a> {
    let mut props = builder.vec_with_capacity(entries.len());
    for (name, reference_id) in entries {
        let ident = builder.ident(name);
        let key = PropertyKey::StaticIdentifier(builder.alloc_identifier_name(SPAN, ident));
        let value = match reference_id {
            Some(reference_id) => {
                builder.expression_identifier_with_reference_id(SPAN, ident, reference_id)
            }
            None => builder.expression_identifier(SPAN, ident),
        };
        props.push(builder.object_property_kind_object_property(
            SPAN,
            PropertyKind::Init,
            key,
            value,
            false,
            true,
            false,
        ));
    }
    builder.expression_object(SPAN, props)
}

// We don't want to pollute tests with current version number so we mock it
// for all tests (except one)
pub fn body_references_name(
    body: &FunctionBody<'_>,
    name: &str,
    scoping: &Scoping,
    function_scope_id: ScopeId,
) -> bool {
    use oxc_ast::ast::IdentifierReference;
    use oxc_ast_visit::Visit;
    struct Probe<'n, 's> {
        name: &'n str,
        scoping: &'s Scoping,
        function_scope_id: ScopeId,
        found: bool,
    }
    impl<'a, 'n, 's> Visit<'a> for Probe<'n, 's> {
        fn visit_identifier_reference(&mut self, it: &IdentifierReference<'a>) {
            if self.found || it.name.as_str() != self.name {
                return;
            }
            let symbol_id = it
                .reference_id
                .get()
                .and_then(|rid| self.scoping.get_reference(rid).symbol_id());
            match symbol_id {
                Some(sid) => {
                    let sym_scope = self.scoping.symbol_scope_id(sid);
                    if !scope_is_inside(self.scoping, sym_scope, self.function_scope_id) {
                        self.found = true;
                    }
                }
                None => {
                    self.found = true;
                }
            }
        }
    }
    let mut probe = Probe {
        name,
        scoping,
        function_scope_id,
        found: false,
    };
    probe.visit_function_body(body);
    probe.found
}
