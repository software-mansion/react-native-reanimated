use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    Argument, AssignmentOperator, AssignmentTarget, Expression, FormalParameterKind,
    FormalParameters, FunctionBody, FunctionType, PropertyKey, PropertyKind, Statement,
    VariableDeclarationKind,
};
use oxc_semantic::Scoping;
use oxc_span::SPAN;
use oxc_syntax::number::NumberBase;
use oxc_syntax::operator::UnaryOperator;
use oxc_syntax::scope::ScopeId;

use crate::closure::{ClosureResult, closure_for_function};
use crate::naming::{WorkletNames, make_worklet_name};
use crate::naming::worklet_hash;
use crate::state::State;
use crate::transformer::builders::no_rest;
use crate::utils::is_release;
use crate::worklet_body::{WorkletBodyOutput, build_worklet_body_string};

const MOCK_VERSION: &str = "x.y.z";

pub struct WorkletInput<'a, 'b> {
    pub params: &'b FormalParameters<'a>,
    pub body: &'b FunctionBody<'a>,
    pub is_async: bool,
    pub is_generator: bool,
    pub function_scope_id: ScopeId,
    pub self_name: Option<&'b str>,
    /// `true` for arrow functions whose body is an implicit-return expression,
    /// e.g. `() => 1`. We rewrite the body's single `ExpressionStatement` into
    /// a `ReturnStatement` so the workletized form preserves the return value.
    pub is_expression_body: bool,
}

impl<'a, 'b> WorkletInput<'a, 'b> {
    /// Whether the original worklet body had a `'no-worklet-closure'`
    /// directive. When set, closure analysis is bypassed and the worklet
    /// is generated with an empty `__closure`.
    pub fn no_worklet_closure(&self) -> bool {
        body_has_directive(self.body, "no-worklet-closure")
    }

    /// Whether the original worklet body had a `'limit-init-data-hoisting'`
    /// directive. When set, the init-data const is placed at the start of
    /// the parent function body rather than file-top-level — keeping the
    /// `_worklet_<hash>_init_data` identifier in lexical scope when the
    /// parent worklet body is eval'd on the UI thread.
    pub fn limit_init_data_hoisting(&self) -> bool {
        body_has_directive(self.body, "limit-init-data-hoisting")
    }
}

fn body_has_directive(body: &FunctionBody<'_>, name: &str) -> bool {
    body.directives
        .iter()
        .any(|d| d.directive.as_str() == name)
}

pub struct FactoryOutput<'a> {
    pub init_data_decl: Option<Statement<'a>>,
    pub factory_call: Expression<'a>,
    pub worklet_hash: u64,
    pub react_name: String,
    /// In bundle mode, the factory body is split into its own
    /// `react-native-worklets/.worklets/<hash>.js` file. The `(path, content)`
    /// pair is bubbled up to the worklet pass to be returned via the napi
    /// `files` field.
    pub bundle_file: Option<(String, String)>,
    /// `true` when the worklet body had a `'limit-init-data-hoisting'`
    /// directive — `init_data_decl` should be placed at the start of the
    /// *parent function* body rather than at file-top-level.
    pub limit_init_data_hoisting: bool,
    /// Names that the synthesized `factory_call` expression now references
    /// inside the surrounding body (closure vars + the init-data id). The
    /// outer-worklet processor uses these to register "must-capture" names
    /// with `PrependCtx` so the outer's closure analysis picks them up even
    /// though they have no `reference_id` (they were minted post-semantic).
    pub injected_ref_names: Vec<String>,
}

pub fn make_worklet_factory<'a>(
    input: WorkletInput<'a, '_>,
    state: &mut State,
    scoping: &Scoping,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    filename: &str,
    force_capture: &std::collections::HashSet<String>,
) -> FactoryOutput<'a> {
    let WorkletNames {
        worklet_name,
        react_name,
    } = {
        let n = state.worklet_number;
        state.worklet_number += 1;
        make_worklet_name(input.self_name, filename, n)
    };

    // `'no-worklet-closure'` opts out of any closure capture (e.g. the
    // installValueUnpacker / installShareableGuestUnpacker family).
    let closure: ClosureResult = if input.no_worklet_closure() {
        ClosureResult::default()
    } else {
        closure_for_function(
            ClosureWalk::new(input.params, input.body),
            input.function_scope_id,
            input.self_name,
            scoping,
            state,
            force_capture,
            filename,
        )
    };
    let limit_init_data_hoisting = input.limit_init_data_hoisting();

    let include_source_map =
        !is_release() && !state.opts.disable_source_maps.unwrap_or(false);
    let mock_source_map = std::env::var("REANIMATED_JEST_SHOULD_MOCK_SOURCE_MAP")
        .map(|v| v == "1")
        .unwrap_or(false);

    let source_map_path = if include_source_map && !mock_source_map {
        Some(filename)
    } else {
        None
    };
    // Detect whether the worklet body recursively references its own name —
    // if so, we'll prepend `const <reactName> = this._recur;` to the body
    // string so the call resolves on the UI thread.
    let recursive_name = input.self_name.and_then(|name| {
        if body_references_name(input.body, name) {
            Some(react_name.as_str())
        } else {
            None
        }
    });

    let body_output: WorkletBodyOutput = build_worklet_body_string(
        &worklet_name,
        input.params,
        input.body,
        input.is_expression_body,
        &closure.closure_variables,
        recursive_name,
        allocator,
        source_map_path,
        if source_map_path.is_some() {
            Some(state.source_text.as_str())
        } else {
            None
        },
    );
    let body_string = body_output.code;

    let hash = worklet_hash(&body_string);

    let bundle_mode = state.opts.bundle_mode.unwrap_or(false);
    let omit_native_only_data = state.opts.omit_native_only_data.unwrap_or(false);
    let should_include_init_data = !omit_native_only_data && !bundle_mode;

    let init_data_id = format!("_worklet_{hash}_init_data");

    let init_data_decl = if should_include_init_data {
        let source_map_for_init = if include_source_map {
            if mock_source_map {
                Some("mock source map".to_string())
            } else {
                body_output.source_map_json
            }
        } else {
            None
        };
        Some(build_init_data_decl(
            builder,
            &init_data_id,
            &body_string,
            filename,
            source_map_for_init.as_deref(),
        ))
    } else {
        None
    };

    let mut factory_expr = build_factory_expression(
        builder,
        allocator,
        &worklet_name,
        &react_name,
        &input,
        &closure.closure_variables,
        hash,
        &init_data_id,
        should_include_init_data,
        state,
    );

    let factory_call = if bundle_mode {
        if let Expression::FunctionExpression(func) = &mut factory_expr {
            if let Some(body) = func.body.as_mut() {
                crate::relative_requires::rewrite_relative_requires(
                    body,
                    filename,
                    &state.workletizable_modules,
                    builder,
                );
            }
        }
        let file_content = codegen_bundle_file(
            builder, allocator, factory_expr, &closure.imports, filename,
        );
        let file_path = format!("react-native-worklets/.worklets/{hash}.js");
        let require_call =
            build_require_factory_call(builder, &file_path, &closure.closure_variables);
        state.emitted_files.push((file_path, file_content));
        require_call
    } else {
        build_factory_call(
            builder,
            factory_expr,
            &init_data_id,
            &closure.closure_variables,
            should_include_init_data,
        )
    };

    let mut injected_ref_names: Vec<String> =
        Vec::with_capacity(closure.closure_variables.len() + 1);
    // Include init_data_id only when it gets hoisted to file top-level. When
    // `limit_init_data_hoisting` is set the decl lives inside the parent
    // function's body — the inner factory call's reference resolves via
    // lexical scope, no closure capture needed by the outer worklet.
    if should_include_init_data && !limit_init_data_hoisting {
        injected_ref_names.push(init_data_id.clone());
    }
    for name in &closure.closure_variables {
        injected_ref_names.push(name.clone());
    }

    FactoryOutput {
        init_data_decl,
        factory_call,
        worklet_hash: hash,
        react_name,
        bundle_file: None,
        limit_init_data_hoisting,
        injected_ref_names,
    }
}

/// Render a standalone JS file containing:
///   import { … } from '<source>'   // for each library/relative import
///   export default (<factory>);
fn codegen_bundle_file<'a>(
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    factory: Expression<'a>,
    imports: &[crate::state::ImportInfo],
    filename: &str,
) -> String {
    use oxc_ast::ast::ExportDefaultDeclarationKind;

    let mut body = builder.vec_with_capacity(imports.len() + 1);
    for info in imports {
        // Relative import sources need rebasing — the bundle file lives at
        // `react-native-worklets/.worklets/<hash>.js`, not at the original
        // file's directory, so a literal `"../foo"` from the source would
        // resolve to the wrong location.
        let mut rebased = info.clone();
        if rebased.source.starts_with('.') {
            if let Some(p) = crate::relative_requires::rebase_to_worklets_dir(
                filename,
                &rebased.source,
            ) {
                rebased.source = p;
            }
        }
        body.push(build_import_declaration(builder, &rebased));
    }
    let export = builder.alloc_export_default_declaration(
        SPAN,
        ExportDefaultDeclarationKind::from(factory),
    );
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
    let _ = allocator;
    printed.code
}

/// Build a single `import` declaration matching the given binding shape.
fn build_import_declaration<'a>(
    builder: AstBuilder<'a>,
    info: &crate::state::ImportInfo,
) -> Statement<'a> {
    use crate::state::ImportShape;
    use oxc_ast::ast::{ImportDeclarationSpecifier, ImportOrExportKind, ModuleExportName};

    let local_atom = builder.ident(&info.local);
    let local_binding = builder.binding_identifier(SPAN, local_atom);
    let mut specifiers = builder.vec_with_capacity(1);
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
    specifiers.push(specifier);

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

/// Build `require(<path>).default(<param_pack>)`.
fn build_require_factory_call<'a>(
    builder: AstBuilder<'a>,
    file_path: &str,
    closure_variables: &[String],
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

    let mut props = builder.vec_with_capacity(closure_variables.len());
    for name in closure_variables {
        let ident = builder.ident(name);
        let key = PropertyKey::StaticIdentifier(builder.alloc_identifier_name(SPAN, ident));
        let value = builder.expression_identifier(SPAN, ident);
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
    let pack = builder.expression_object(SPAN, props);

    let mut args = builder.vec_with_capacity(1);
    args.push(Argument::from(pack));
    builder.expression_call(SPAN, dot_default, NONE, args, false)
}

fn build_init_data_decl<'a>(
    builder: AstBuilder<'a>,
    init_data_id: &str,
    body_string: &str,
    filename: &str,
    source_map_json: Option<&str>,
) -> Statement<'a> {
    let mut props = builder.vec_with_capacity(3);

    let code_str = builder.str(body_string);
    let code_value = builder.expression_string_literal(SPAN, code_str, None);
    props.push(builder.object_property_kind_object_property(
        SPAN,
        PropertyKind::Init,
        PropertyKey::StaticIdentifier(builder.alloc_identifier_name(SPAN, "code")),
        code_value,
        false,
        false,
        false,
    ));

    if !is_release() {
        let loc_str = builder.str(filename);
        let loc_value = builder.expression_string_literal(SPAN, loc_str, None);
        props.push(builder.object_property_kind_object_property(
            SPAN,
            PropertyKind::Init,
            PropertyKey::StaticIdentifier(
                builder.alloc_identifier_name(SPAN, "location"),
            ),
            loc_value,
            false,
            false,
            false,
        ));
    }

    if let Some(sm) = source_map_json {
        let sm_str = builder.str(sm);
        let sm_value = builder.expression_string_literal(SPAN, sm_str, None);
        props.push(builder.object_property_kind_object_property(
            SPAN,
            PropertyKind::Init,
            PropertyKey::StaticIdentifier(
                builder.alloc_identifier_name(SPAN, "sourceMap"),
            ),
            sm_value,
            false,
            false,
            false,
        ));
    }

    let init_data_obj = builder.expression_object(SPAN, props);

    let id_pat = builder.binding_pattern_binding_identifier(SPAN, builder.ident(init_data_id));
    let declarator = builder.variable_declarator(
        SPAN,
        VariableDeclarationKind::Const,
        id_pat,
        NONE,
        Some(init_data_obj),
        false,
    );
    let mut decls = builder.vec_with_capacity(1);
    decls.push(declarator);

    Statement::VariableDeclaration(builder.alloc_variable_declaration(
        SPAN,
        VariableDeclarationKind::Const,
        decls,
        false,
    ))
}

fn build_factory_expression<'a>(
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    worklet_name: &str,
    react_name: &str,
    input: &WorkletInput<'a, '_>,
    closure_variables: &[String],
    worklet_hash: u64,
    init_data_id: &str,
    should_include_init_data: bool,
    state: &State,
) -> Expression<'a> {
    let mut binding_props = builder.vec_with_capacity(closure_variables.len() + 1);

    if should_include_init_data {
        let ident = builder.ident(init_data_id);
        binding_props.push(builder.binding_property(
            SPAN,
            PropertyKey::StaticIdentifier(builder.alloc_identifier_name(SPAN, ident)),
            builder.binding_pattern_binding_identifier(SPAN, ident),
            true,
            false,
        ));
    }
    for name in closure_variables {
        let ident = builder.ident(name);
        binding_props.push(builder.binding_property(
            SPAN,
            PropertyKey::StaticIdentifier(builder.alloc_identifier_name(SPAN, ident)),
            builder.binding_pattern_binding_identifier(SPAN, ident),
            true,
            false,
        ));
    }

    let pat = builder.binding_pattern_object_pattern(SPAN, binding_props, no_rest());
    let factory_param = builder.plain_formal_parameter(SPAN, pat);
    let mut params_vec = builder.vec_with_capacity(1);
    params_vec.push(factory_param);
    let factory_params = builder.formal_parameters(
        SPAN,
        FormalParameterKind::FormalParameter,
        params_vec,
        NONE,
    );

    let mut stmts = builder.vec_with_capacity(8);

    let inject_stack_details = !is_release() && !state.opts.bundle_mode.unwrap_or(false);

    if inject_stack_details {
        let line_offset = if closure_variables.is_empty() {
            1i32
        } else {
            1 - (closure_variables.len() as i32) - 2
        };
        stmts.push(build_const_e(builder, line_offset));
    }

    stmts.push(build_inner_fn_decl(
        builder,
        allocator,
        react_name,
        input,
    ));

    stmts.push(build_member_assign(
        builder,
        react_name,
        "__closure",
        build_closure_object(builder, closure_variables),
    ));

    stmts.push(build_member_assign(
        builder,
        react_name,
        "__workletHash",
        builder.expression_numeric_literal(SPAN, worklet_hash as f64, None, NumberBase::Decimal),
    ));

    if !is_release() {
        // Prefer the version the JS shim sniffed from
        // `react-native-worklets/package.json`. Fall back to the test mock
        // when nothing was supplied (snapshot tests, direct napi calls).
        let version = state
            .opts
            .plugin_version
            .as_deref()
            .unwrap_or(MOCK_VERSION);
        let version_str = builder.str(version);
        stmts.push(build_member_assign(
            builder,
            react_name,
            "__pluginVersion",
            builder.expression_string_literal(SPAN, version_str, None),
        ));
    }

    if should_include_init_data {
        stmts.push(build_member_assign(
            builder,
            react_name,
            "__initData",
            builder.expression_identifier(SPAN, builder.ident(init_data_id)),
        ));
    }

    if inject_stack_details {
        stmts.push(build_member_assign(
            builder,
            react_name,
            "__stackDetails",
            builder.expression_identifier(SPAN, "_e"),
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

fn build_const_e<'a>(builder: AstBuilder<'a>, line_offset: i32) -> Statement<'a> {
    let global_error = builder.expression_new(
        SPAN,
        Expression::from(builder.member_expression_static(
            SPAN,
            builder.expression_identifier(SPAN, "global"),
            builder.identifier_name(SPAN, "Error"),
            false,
        )),
        NONE,
        builder.vec(),
    );

    let line = builder.expression_numeric_literal(
        SPAN,
        line_offset as f64,
        None,
        NumberBase::Decimal,
    );
    let neg27 = builder.expression_unary(
        SPAN,
        UnaryOperator::UnaryNegation,
        builder.expression_numeric_literal(SPAN, 27.0, None, NumberBase::Decimal),
    );

    let mut elements = builder.vec_with_capacity(3);
    elements.push(oxc_ast::ast::ArrayExpressionElement::from(global_error));
    elements.push(oxc_ast::ast::ArrayExpressionElement::from(line));
    elements.push(oxc_ast::ast::ArrayExpressionElement::from(neg27));
    let arr = builder.expression_array(SPAN, elements);

    let id_pat = builder.binding_pattern_binding_identifier(SPAN, "_e");
    let declarator = builder.variable_declarator(
        SPAN,
        VariableDeclarationKind::Const,
        id_pat,
        NONE,
        Some(arr),
        false,
    );
    let mut decls = builder.vec_with_capacity(1);
    decls.push(declarator);
    Statement::VariableDeclaration(builder.alloc_variable_declaration(
        SPAN,
        VariableDeclarationKind::Const,
        decls,
        false,
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
    body_clone.directives = builder.vec();
    if input.is_expression_body {
        rewrite_implicit_return(&mut body_clone, builder);
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

    let id_pat = builder.binding_pattern_binding_identifier(SPAN, builder.ident(react_name));
    let declarator = builder.variable_declarator(
        SPAN,
        VariableDeclarationKind::Const,
        id_pat,
        NONE,
        Some(init),
        false,
    );
    let mut decls = builder.vec_with_capacity(1);
    decls.push(declarator);
    Statement::VariableDeclaration(builder.alloc_variable_declaration(
        SPAN,
        VariableDeclarationKind::Const,
        decls,
        false,
    ))
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

fn build_closure_object<'a>(
    builder: AstBuilder<'a>,
    closure_variables: &[String],
) -> Expression<'a> {
    let mut props = builder.vec_with_capacity(closure_variables.len());
    for name in closure_variables {
        let ident = builder.ident(name);
        let key = PropertyKey::StaticIdentifier(builder.alloc_identifier_name(SPAN, ident));
        let value = builder.expression_identifier(SPAN, ident);
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

fn build_factory_call<'a>(
    builder: AstBuilder<'a>,
    factory: Expression<'a>,
    init_data_id: &str,
    closure_variables: &[String],
    should_include_init_data: bool,
) -> Expression<'a> {
    let mut props = builder.vec_with_capacity(closure_variables.len() + 1);

    if should_include_init_data {
        let ident = builder.ident(init_data_id);
        let key = PropertyKey::StaticIdentifier(builder.alloc_identifier_name(SPAN, ident));
        let value = builder.expression_identifier(SPAN, ident);
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
    for name in closure_variables {
        let ident = builder.ident(name);
        let key = PropertyKey::StaticIdentifier(builder.alloc_identifier_name(SPAN, ident));
        let value = builder.expression_identifier(SPAN, ident);
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
    let param_pack = builder.expression_object(SPAN, props);

    let mut args = builder.vec_with_capacity(1);
    args.push(Argument::from(param_pack));
    builder.expression_call(SPAN, factory, NONE, args, false)
}

/// Quick AST scan: does any identifier-reference in `body` have the given
/// name? Used to decide whether to prepend a `const <name> = this._recur;`
/// binding so recursive calls inside a workletized function still resolve.
fn body_references_name(body: &FunctionBody<'_>, name: &str) -> bool {
    use oxc_ast::ast::IdentifierReference;
    use oxc_ast_visit::Visit;
    struct Probe<'n> {
        name: &'n str,
        found: bool,
    }
    impl<'a, 'n> Visit<'a> for Probe<'n> {
        fn visit_identifier_reference(&mut self, it: &IdentifierReference<'a>) {
            if !self.found && it.name.as_str() == self.name {
                self.found = true;
            }
        }
    }
    let mut probe = Probe { name, found: false };
    probe.visit_function_body(body);
    probe.found
}

/// Replace the body's single `ExpressionStatement` with a `ReturnStatement`
/// to preserve the implicit return when converting `() => expr` → `function(){ ... }`.
fn rewrite_implicit_return<'a>(body: &mut FunctionBody<'a>, builder: AstBuilder<'a>) {
    use oxc_allocator::TakeIn;
    if body.statements.len() != 1 {
        return;
    }
    let stmt = body.statements.first_mut().unwrap();
    if let Statement::ExpressionStatement(es) = stmt {
        let expr = es.expression.take_in(builder);
        *stmt = builder.statement_return(SPAN, Some(expr));
    }
}

pub struct ClosureWalk<'a, 'b> {
    params: &'b FormalParameters<'a>,
    body: &'b FunctionBody<'a>,
}

impl<'a, 'b> ClosureWalk<'a, 'b> {
    pub fn new(
        params: &'b FormalParameters<'a>,
        body: &'b FunctionBody<'a>,
    ) -> Self {
        Self { params, body }
    }
}

impl<'a, 'b> crate::closure::WalkFunctionBody<'a> for ClosureWalk<'a, 'b> {
    fn walk_into<V: oxc_ast_visit::Visit<'a>>(self, visitor: &mut V) {
        visitor.visit_function_body(self.body);
        visitor.visit_formal_parameters(self.params);
    }
}
