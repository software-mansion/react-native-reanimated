use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::ast::{
    Argument, AssignmentOperator, AssignmentTarget, Expression, FormalParameterKind,
    FormalParameters, FunctionBody, FunctionType, PropertyKey, PropertyKind, Statement,
};
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_semantic::Scoping;
use oxc_span::SPAN;
use oxc_syntax::node::NodeId;
use oxc_syntax::number::NumberBase;
use oxc_syntax::reference::{Reference, ReferenceFlags, ReferenceId};
use oxc_syntax::scope::ScopeId;

use crate::closure::{get_closure, scope_is_inside};
use crate::imports::{create_import_path, update_relative_requires};
use crate::jsx_dev_attributes::strip_jsx_dev_attributes;
use crate::naming::worklet_hash;
use crate::naming::{make_worklet_name, WorkletNames};
use crate::types::State;
use crate::utils::{
    closure_binding_pattern, const_decl, identifier_binding_pattern, is_release,
    replace_implicit_return_with_block, strip_worklet_directives,
};
use crate::worklet_string_code::build_worklet_string;

const MOCK_VERSION: &str = "x.y.z";

const REAL_VERSION: &str = env!("WORKLETS_PACKAGE_VERSION");

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

fn generate_worklet_file<'a>(
    builder: AstBuilder<'a>,
    mut factory: Expression<'a>,
    imports: &[crate::types::ImportInfo],
    filename: &str,
    worklets_package_dir: Option<&str>,
) -> String {
    use oxc_ast::ast::ExportDefaultDeclarationKind;

    strip_jsx_dev_attributes(&mut factory);

    let mut body = builder.vec_with_capacity(imports.len() + 1);
    for info in imports {
        let is_rel = info.source.starts_with('.');
        if matches!(info.shape, crate::types::ImportShape::Default) && is_rel {
            continue;
        }
        let mut rebased = info.clone();
        if rebased.source.starts_with('.') {
            if let Some(p) = create_import_path(filename, &rebased.source, worklets_package_dir) {
                rebased.source = p;
            }
        }
        body.push(build_import_declaration(builder, &rebased));
    }
    let export =
        builder.alloc_export_default_declaration(SPAN, ExportDefaultDeclarationKind::from(factory));
    body.push(Statement::ExportDefaultDeclaration(export));

    let program = builder.program(
        SPAN,
        oxc_span::SourceType::mjs(),
        "",
        builder.vec(),
        None,
        builder.vec(),
        body,
    );
    let printed = oxc_codegen::Codegen::new()
        .with_options(oxc_codegen::CodegenOptions::default())
        .build(&program);

    if std::env::var("WORKLETS_WRITE_ORIGIN").is_ok() {
        return format!("// __workletOrigin: {filename}\n{}", printed.code);
    }
    printed.code
}

fn build_import_declaration<'a>(
    builder: AstBuilder<'a>,
    info: &crate::types::ImportInfo,
) -> Statement<'a> {
    use crate::types::ImportShape;
    use oxc_ast::ast::{ImportDeclarationSpecifier, ImportOrExportKind, ModuleExportName};

    let local_atom = builder.ident(&info.local);
    let local_binding = builder.binding_identifier(SPAN, local_atom);
    let specifier = match &info.shape {
        ImportShape::Default => ImportDeclarationSpecifier::ImportDefaultSpecifier(
            builder.alloc_import_default_specifier(SPAN, local_binding),
        ),
        ImportShape::Namespace => ImportDeclarationSpecifier::ImportNamespaceSpecifier(
            builder.alloc_import_namespace_specifier(SPAN, local_binding),
        ),
        ImportShape::Named { imported } => {
            let imported_atom = builder.ident(imported);
            let imported_name =
                ModuleExportName::IdentifierName(builder.identifier_name(SPAN, imported_atom));
            ImportDeclarationSpecifier::ImportSpecifier(builder.alloc_import_specifier(
                SPAN,
                imported_name,
                local_binding,
                ImportOrExportKind::Value,
            ))
        }
    };
    let specifiers = builder.vec1(specifier);

    let source_str = builder.str(&info.source);
    let source = builder.string_literal(SPAN, source_str, None);
    let decl = builder.alloc_import_declaration(
        SPAN,
        Some(specifiers),
        source,
        None,
        NONE,
        ImportOrExportKind::Value,
    );
    Statement::ImportDeclaration(decl)
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

fn build_factory_expression<'a>(
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

    let mut stmts = builder.vec_with_capacity(8);

    stmts.push(build_inner_fn_decl(builder, allocator, react_name, input));

    stmts.push(build_member_assign(
        builder,
        react_name,
        "__closure",
        build_closure_object(
            builder,
            closure_variables.iter().map(|name| (name.as_str(), None)),
        ),
    ));

    stmts.push(build_member_assign(
        builder,
        react_name,
        "__workletHash",
        builder.expression_numeric_literal(SPAN, worklet_hash as f64, None, NumberBase::Decimal),
    ));

    if !is_release(state.opts.env_name.as_deref()) {
        let version: &str = if should_mock_version() {
            MOCK_VERSION
        } else {
            state.opts.plugin_version.as_deref().unwrap_or(REAL_VERSION)
        };
        let version_str = builder.str(version);
        stmts.push(build_member_assign(
            builder,
            react_name,
            "__pluginVersion",
            builder.expression_string_literal(SPAN, version_str, None),
        ));
    }

    stmts.push(builder.statement_return(
        SPAN,
        Some(builder.expression_identifier(SPAN, builder.ident(react_name))),
    ));

    let factory_body = builder.function_body(SPAN, builder.vec(), stmts);

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

fn build_closure_object<'a, 'n>(
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
fn should_mock_version() -> bool {
    std::env::var("WORKLETS_JEST_SHOULD_MOCK_VERSION")
        .map(|v| v == "1")
        .unwrap_or(false)
}

fn body_references_name(
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
