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
use crate::utils::{body_has_directive, is_release, relativize, rewrite_implicit_return};
use crate::worklet_body::{WorkletBodyOutput, build_worklet_body_string};

const MOCK_VERSION: &str = "x.y.z";

/// Suffix appended to a worklet-class binding name when it appears in
/// `new <Class>(...)` inside a worklet body. Mirrors
/// `workletClassFactorySuffix` in babel-plugin-worklets' types.ts.
const CLASS_FACTORY_SUFFIX: &str = "__classFactory";

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

pub struct FactoryOutput<'a> {
    pub init_data_decl: Option<Statement<'a>>,
    pub factory_call: Expression<'a>,
    pub react_name: String,
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
        let n = state.next_worklet_number();
        make_worklet_name(input.self_name, filename, n)
    };

    // `'no-worklet-closure'` opts out of any closure capture (e.g. the
    // installValueUnpacker / installShareableGuestUnpacker family).
    let mut closure: ClosureResult = if input.no_worklet_closure() {
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

    // Worklet-class rewrite (mirrors `workletStringCode.ts:71-105`): any
    // captured identifier used as `new Foo(...)` inside the worklet body gets
    // its closure entry renamed `Foo` → `Foo__classFactory`. The worklet body
    // then receives a prepended `const Foo = Foo__classFactory();` so the
    // constructor call resolves on the UI thread. Disabled in bundle mode and
    // when `disableWorkletClasses` is set.
    let rewritten_classes: Vec<String> = if !state.opts.bundle_mode.unwrap_or(false)
        && !state.opts.disable_worklet_classes.unwrap_or(false)
    {
        let captured: std::collections::HashSet<&str> = closure
            .closure_variables
            .iter()
            .map(|s| s.as_str())
            .collect();
        let referenced = collect_new_expression_class_names(input.body, &captured);
        if !referenced.is_empty() {
            // Mutate closure variables: each `Foo` becomes `Foo__classFactory`,
            // preserving insertion order.
            for name in closure.closure_variables.iter_mut() {
                if referenced.contains(name) {
                    name.push_str(CLASS_FACTORY_SUFFIX);
                }
            }
            referenced.into_iter().collect()
        } else {
            Vec::new()
        }
    } else {
        Vec::new()
    };

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
        &rewritten_classes,
        allocator,
        source_map_path,
        &state.source_text,
    );
    let body_string = body_output.code;

    let hash = worklet_hash(&body_string);

    let bundle_mode = state.opts.bundle_mode.unwrap_or(false);
    let omit_native_only_data = state.opts.omit_native_only_data.unwrap_or(false);
    let should_include_init_data = !omit_native_only_data && !bundle_mode;

    let init_data_id = format!("_worklet_{hash}_init_data");

    let init_data_decl = if should_include_init_data {
        // `relativeSourceLocation` rewrites `__initData.location` to a path
        // relative to `cwd`, and the same swap is mirrored in the embedded
        // source map's `sources` field so devtools agree. Falls back to the
        // absolute filename when `cwd` was not supplied.
        let location_for_init = if state.opts.relative_source_location.unwrap_or(false) {
            let cwd = state.opts.cwd.as_deref().unwrap_or("");
            relativize(cwd, filename)
        } else {
            filename.to_string()
        };
        let source_map_for_init = if include_source_map {
            if mock_source_map {
                Some("mock source map".to_string())
            } else {
                body_output.source_map_json.map(|json| {
                    if location_for_init != filename {
                        json.replace(filename, &location_for_init)
                    } else {
                        json
                    }
                })
            }
        } else {
            None
        };
        Some(build_init_data_decl(
            builder,
            &init_data_id,
            &body_string,
            &location_for_init,
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
                    state.opts.worklets_package_dir.as_deref(),
                    builder,
                );
            }
        }
        let file_content = codegen_bundle_file(
            builder,
            factory_expr,
            &closure.imports,
            filename,
            state.opts.worklets_package_dir.as_deref(),
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
            bundle_mode,
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
        // Report the outer-visible name (i.e. the actual identifier the call
        // site references). For worklet-class captures that's the base name,
        // not the `__classFactory`-suffixed form we use inside the factory.
        let outer_name = factory_param_name(name, bundle_mode).to_string();
        injected_ref_names.push(outer_name);
    }

    FactoryOutput {
        init_data_decl,
        factory_call,
        react_name,
        limit_init_data_hoisting,
        injected_ref_names,
    }
}

/// Render a standalone JS file containing:
///   import { … } from '<source>'   // for each library/relative import
///   export default (<factory>);
fn codegen_bundle_file<'a>(
    builder: AstBuilder<'a>,
    factory: Expression<'a>,
    imports: &[crate::state::ImportInfo],
    filename: &str,
    worklets_package_dir: Option<&str>,
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
            if let Some(p) = crate::relative_requires::rebase_to_worklets_dir_with(
                filename,
                &rebased.source,
                worklets_package_dir,
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
    let bundle_mode = state.opts.bundle_mode.unwrap_or(false);
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
        // Worklet-class names land here suffixed (`Foo__classFactory`) but the
        // factory's bound name needs to be the *base* (`Foo`), since the call
        // site passes `{ Foo: Foo }` and the inner fn body references `Foo`.
        // Bundle mode skips this — there's no class factory wrapping.
        let bind_name = factory_param_name(name, bundle_mode);
        let ident = builder.ident(bind_name);
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
        // `_e` records `[new Error(), <line_offset>, -27]` so the worklet runtime
        // can subtract a known offset from the captured stack frame to recover
        // the *worklet body*'s line number (the body lives inside the factory
        // function body). Babel's plugin pins these constants — they depend on
        // the structural shape of the emitted factory:
        //   * `1` — base offset when the factory has no closure destructure
        //     (no `const { … } = …` line before the inner fn declaration).
        //   * `1 - len - 2` — when closure vars are present, codegen prints the
        //     destructure pattern across `len + 2` extra lines (open brace,
        //     trailing brace, one name per line in non-minified output), so
        //     we walk back that far to land on the inner fn body.
        //   * `-27` — fixed offset for the worklet body inside the inner fn.
        //     Mirrors `STACK_DETAILS_LINE_OFFSET` in workletFactory.ts.
        // Keep these in sync if the emitted factory layout changes.
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
        build_closure_object(builder, closure_variables, bundle_mode),
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
    bundle_mode: bool,
) -> Expression<'a> {
    let mut props = builder.vec_with_capacity(closure_variables.len());
    for name in closure_variables {
        if !bundle_mode {
            if let Some(base) = name.strip_suffix(CLASS_FACTORY_SUFFIX) {
                // Worklet class capture: `Foo__classFactory: Foo.Foo__classFactory`.
                // The base class binding `Foo` was attached `Foo__classFactory`
                // by worklet_class.rs; this lifts it into the closure.
                let key_ident = builder.ident(name);
                let key = PropertyKey::StaticIdentifier(
                    builder.alloc_identifier_name(SPAN, key_ident),
                );
                let base_ident = builder.ident(base);
                let value = Expression::from(builder.member_expression_static(
                    SPAN,
                    builder.expression_identifier(SPAN, base_ident),
                    builder.identifier_name(SPAN, key_ident),
                    false,
                ));
                props.push(builder.object_property_kind_object_property(
                    SPAN,
                    PropertyKind::Init,
                    key,
                    value,
                    false,
                    false,
                    false,
                ));
                continue;
            }
        }
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

/// In non-bundle-mode, the factory destructures the suffix-stripped name —
/// `Foo__classFactory` → `Foo` — so the inner fn body's `Foo` references
/// resolve to the bound class. Bundle mode keeps the full name (no class
/// wrapping happens there).
fn factory_param_name<'a>(name: &'a str, bundle_mode: bool) -> &'a str {
    if bundle_mode {
        return name;
    }
    name.strip_suffix(CLASS_FACTORY_SUFFIX).unwrap_or(name)
}

fn build_factory_call<'a>(
    builder: AstBuilder<'a>,
    factory: Expression<'a>,
    init_data_id: &str,
    closure_variables: &[String],
    should_include_init_data: bool,
    bundle_mode: bool,
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
        let pack_name = factory_param_name(name, bundle_mode);
        let ident = builder.ident(pack_name);
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

/// Walk the worklet body collecting names used as the callee of a
/// `new <id>(...)` expression, filtered to those present in `captured`.
/// Mirrors workletStringCode.ts:71-105 — when a worklet captures a class
/// constructor that's itself a worklet class, we have to rewrite the closure
/// entry so the runtime can re-build the class on the UI thread.
fn collect_new_expression_class_names<'a>(
    body: &FunctionBody<'a>,
    captured: &std::collections::HashSet<&str>,
) -> std::collections::HashSet<String> {
    use oxc_ast::ast::NewExpression;
    use oxc_ast_visit::Visit;
    struct Probe<'c, 'n> {
        captured: &'c std::collections::HashSet<&'n str>,
        found: std::collections::HashSet<String>,
    }
    impl<'a, 'c, 'n> Visit<'a> for Probe<'c, 'n> {
        fn visit_new_expression(&mut self, it: &NewExpression<'a>) {
            if let Expression::Identifier(id) = &it.callee {
                let name = id.name.as_str();
                if self.captured.contains(name) {
                    self.found.insert(name.to_string());
                }
            }
            // Continue walking so nested `new X(new Y())` both register.
            oxc_ast_visit::walk::walk_new_expression(self, it);
        }
    }
    let mut probe = Probe {
        captured,
        found: std::collections::HashSet::new(),
    };
    probe.visit_function_body(body);
    probe.found
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

