use oxc_allocator::Allocator;
use oxc_ast::ast::{Argument, Expression, FormalParameters, FunctionBody};
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_semantic::Scoping;
use oxc_span::SPAN;
use oxc_syntax::node::NodeId;
use oxc_syntax::reference::{Reference, ReferenceFlags, ReferenceId};
use oxc_syntax::scope::ScopeId;

use crate::closure::get_closure;
use crate::factory_expression::{
    body_references_name, build_closure_object, build_factory_expression,
};
use crate::imports::update_relative_requires;
use crate::naming::make_worklet_name;
use crate::naming::worklet_hash;
use crate::types::State;
use crate::worklet_file::{generate_worklet_file, write_worklet_file};
use crate::worklet_string_code::build_worklet_string;

pub struct WorkletInput<'a, 'b> {
    pub params: &'b FormalParameters<'a>,
    pub body: &'b FunctionBody<'a>,
    pub is_async: bool,
    pub is_generator: bool,
    pub function_scope_id: ScopeId,
    pub self_name: Option<&'b str>,
    pub self_name_binds: bool,
    pub is_expression_body: bool,
}

impl<'a, 'b> WorkletInput<'a, 'b> {
    pub fn recursion_name(&self) -> Option<&'b str> {
        if self.self_name_binds {
            self.self_name
        } else {
            None
        }
    }
}

pub struct FactoryOutput<'a> {
    pub factory_call: Expression<'a>,
    pub react_name: String,
}

#[derive(Clone, Copy)]
pub struct FactoryContext<'a, 'b> {
    pub builder: AstBuilder<'a>,
    pub allocator: &'a Allocator,
    pub filename: &'b str,
}

pub fn make_worklet_factory<'a>(
    input: WorkletInput<'a, '_>,
    state: &mut State,
    scoping: &mut Scoping,
    ctx: FactoryContext<'a, '_>,
) -> FactoryOutput<'a> {
    let FactoryContext {
        builder,
        allocator,
        filename,
    } = ctx;
    let names = {
        let n = state.next_worklet_number();
        make_worklet_name(input.self_name, filename, n)
    };

    let closure = get_closure(&input, scoping, state, filename);

    let recursive_name = input.recursion_name().and_then(|name| {
        if body_references_name(input.body, name, scoping, input.function_scope_id) {
            Some(names.react_name.as_str())
        } else {
            None
        }
    });

    if state.error.is_none() && closure.closure_variables.contains(&names.react_name) {
        state.error = Some(format!(
            "the `{}` worklet shadows a captured binding of the same name",
            names.react_name
        ));
    }

    let body_string = build_worklet_string(
        &names.worklet_name,
        &input,
        &closure.closure_variables,
        recursive_name,
        allocator,
        &state.source_text,
    );

    let hash = worklet_hash(&body_string);

    let mut factory_expr = build_factory_expression(
        builder,
        allocator,
        &names,
        &input,
        &closure.closure_variables,
        hash,
        state,
    );

    if let Expression::FunctionExpression(func) = &mut factory_expr {
        if let Some(body) = func.body.as_mut() {
            update_relative_requires(
                body,
                filename,
                &state.forwardable_relative_paths,
                state.opts.worklets_package_dir.as_deref(),
                builder,
            );
        }
    }
    let file_content = generate_worklet_file(
        builder,
        factory_expr,
        &closure.imports,
        filename,
        state.opts.worklets_package_dir.as_deref(),
    );
    let file_path = format!("react-native-worklets/.worklets/{hash}.js");

    if let Some(package_dir) = state.opts.worklets_package_dir.as_deref() {
        if let Err(message) = write_worklet_file(package_dir, &file_path, &file_content) {
            if state.error.is_none() {
                state.error = Some(message);
            }
        }
    }

    let call_scope = scoping
        .scope_parent_id(input.function_scope_id)
        .unwrap_or_else(|| scoping.root_scope_id());
    let bound_closure = bind_closure_references(scoping, call_scope, &closure.closure_variables);

    let factory_call = make_worklet_factory_call(builder, &file_path, &bound_closure);
    state.emitted_files.push((file_path, file_content));

    FactoryOutput {
        factory_call,
        react_name: names.react_name,
    }
}

fn bind_closure_references(
    scoping: &mut Scoping,
    call_scope: ScopeId,
    closure_variables: &[String],
) -> Vec<(String, Option<ReferenceId>)> {
    closure_variables
        .iter()
        .map(|name| {
            let reference_id =
                scoping
                    .find_binding(call_scope, name.as_str().into())
                    .map(|symbol_id| {
                        let reference = Reference::new_with_symbol_id(
                            NodeId::DUMMY,
                            symbol_id,
                            call_scope,
                            ReferenceFlags::read(),
                        );
                        let reference_id = scoping.create_reference(reference);
                        scoping.add_resolved_reference(symbol_id, reference_id);
                        reference_id
                    });
            (name.clone(), reference_id)
        })
        .collect()
}

fn make_worklet_factory_call<'a>(
    builder: AstBuilder<'a>,
    file_path: &str,
    closure: &[(String, Option<ReferenceId>)],
) -> Expression<'a> {
    let path_str = builder.str(file_path);
    let require_call = builder.expression_call(
        SPAN,
        builder.expression_identifier(SPAN, "require"),
        NONE,
        {
            let mut args = builder.vec_with_capacity(1);
            args.push(Argument::from(
                builder.expression_string_literal(SPAN, path_str, None),
            ));
            args
        },
        false,
    );
    let dot_default = Expression::from(builder.member_expression_static(
        SPAN,
        require_call,
        builder.identifier_name(SPAN, "default"),
        false,
    ));

    let mut args = builder.vec_with_capacity(1);
    args.push(Argument::from(build_closure_object(
        builder,
        closure.iter().map(|(name, id)| (name.as_str(), *id)),
    )));
    builder.expression_call(SPAN, dot_default, NONE, args, false)
}
