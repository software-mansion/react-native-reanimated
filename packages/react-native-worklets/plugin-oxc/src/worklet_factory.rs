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
use oxc_syntax::scope::ScopeId;

use crate::closure::{ClosureResult, closure_for_function};
use crate::naming::{WorkletNames, make_worklet_name};
use crate::naming::worklet_hash;
use crate::state::State;
use crate::transformer::builders::no_rest;
use crate::utils::{body_has_directive, is_release, rewrite_implicit_return};
use crate::worklet_body::{WorkletBodyOutput, build_worklet_body_string};

const MOCK_VERSION: &str = "x.y.z";

/// Baked at build time from `../package.json` (see `build.rs`). Mirrors the
/// `REAL_VERSION = require('../../package.json').version` constant in
/// `workletFactory.ts:50`. Used as the fallback when `opts.pluginVersion`
/// isn't supplied by the JS shim (e.g. raw napi callers).
const REAL_VERSION: &str = env!("WORKLETS_PACKAGE_VERSION");

/// Set by the snapshot suite (and by tests that pin a deterministic version
/// into the codegen output) to ignore any real `pluginVersion` and stamp the
/// `__pluginVersion` field with `MOCK_VERSION` instead. Matches the env gate
/// in `workletFactory.ts:288, 448-452`.
fn mock_version_active() -> bool {
    std::env::var("WORKLETS_JEST_SHOULD_MOCK_VERSION")
        .map(|v| v == "1")
        .unwrap_or(false)
}

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

    // `'no-worklet-closure'` is deliberately ignored: bundle mode always
    // captures the closure, since the worklet body is hoisted into its own
    // module and can't reach the original scope any other way. Mirrors
    // `workletFactory.ts:66` (`state.opts.bundleMode || !hasDirective(…)`).
    let closure: ClosureResult = {
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

    // Worklet classes are not supported in bundle-only mode (mirrors the
    // `state.opts.bundleMode /* temporary */` short-circuit in `class.ts:49`).
    // Keep the empty list so downstream `build_worklet_body_string` skips the
    // `const Foo = Foo__classFactory();` prepend.
    let rewritten_classes: Vec<String> = Vec::new();

    let include_source_map =
        !is_release(state.opts.env_name.as_deref()) && !state.opts.disable_source_maps.unwrap_or(false);
    let mock_source_map = std::env::var("WORKLETS_JEST_SHOULD_MOCK_SOURCE_MAP")
        .map(|v| v == "1")
        .unwrap_or(false);

    let source_map_path = if include_source_map && !mock_source_map {
        Some(filename)
    } else {
        None
    };
    // Detect whether the worklet body recursively references its own name —
    // if so, we'll prepend `const <reactName> = this._recur;` to the body
    // string so the call resolves on the UI thread. Scope-aware: a local
    // shadowing binding (e.g. `function foo() { let foo = 1; foo(); }`) MUST
    // NOT trigger the `_recur` injection.
    let recursive_name = input.self_name.and_then(|name| {
        if body_references_name(input.body, name, scoping, input.function_scope_id) {
            Some(react_name.as_str())
        } else {
            None
        }
    });

    let body_output: WorkletBodyOutput = build_worklet_body_string(
        &worklet_name,
        input.params,
        input.body,
        input.is_async,
        input.is_generator,
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

    // Bundle mode never emits an `__initData` const at file top-level — the
    // worklet body string and source map are reconstructed from the emitted
    // `.worklets/<hash>.js` file at runtime instead. Matches
    // `workletFactory.ts:205` (`!state.opts.bundleMode` guard).
    let _omit_native_only_data = state.opts.omit_native_only_data.unwrap_or(false);
    let should_include_init_data = false;

    // Reserve a unique init-data identifier. Two worklets with byte-identical
    // body strings hash to the same value; without this we'd emit two
    // `const _worklet_<hash>_init_data = …` declarations at the top level and
    // tank the file with a SyntaxError on re-declaration.
    let init_data_id = state.reserve_init_data_id(&format!("_worklet_{hash}_init_data"));

    // Bundle mode never emits an init-data decl; the body string lives in the
    // emitted `.worklets/<hash>.js` file instead.
    let init_data_decl: Option<Statement<'a>> = None;
    // Silence the unused-var warnings the bundleless path used to consume.
    let _ = (include_source_map, mock_source_map, &body_output.source_map_json);

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

    if let Expression::FunctionExpression(func) = &mut factory_expr {
        if let Some(body) = func.body.as_mut() {
            crate::relative_requires::rewrite_relative_requires(
                body,
                filename,
                &state.forwardable_relative_paths,
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
    let factory_call =
        build_require_factory_call(builder, &file_path, &closure.closure_variables);
    state.emitted_files.push((file_path, file_content));

    let mut injected_ref_names: Vec<String> =
        Vec::with_capacity(closure.closure_variables.len());
    for name in &closure.closure_variables {
        injected_ref_names.push(name.clone());
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
    mut factory: Expression<'a>,
    imports: &[crate::state::ImportInfo],
    filename: &str,
    worklets_package_dir: Option<&str>,
) -> String {
    use oxc_ast::ast::ExportDefaultDeclarationKind;

    crate::jsx_dev_attributes::strip_jsx_dev_attributes(&mut factory);

    let mut body = builder.vec_with_capacity(imports.len() + 1);
    for info in imports {
        // Mirror the TS plugin's `generate.ts` filter (`generate.ts:31-34, 52-55`):
        //   * library bindings: only `ImportSpecifier` + `ImportDefaultSpecifier`
        //   * relative bindings: only `ImportSpecifier`
        // `Namespace` never makes it this far (closure.rs falls through to
        // closure capture). Default imports for **relative** sources are
        // silently dropped — the TS plugin has the same behaviour.
        let is_rel = info.source.starts_with('.');
        let keep = match (&info.shape, is_rel) {
            (crate::state::ImportShape::Namespace, _) => false,
            (crate::state::ImportShape::Default, true) => false,
            _ => true,
        };
        if !keep {
            continue;
        }
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

    // Debug aid mirroring `generate.ts` — lets a human trace an emitted
    // `<hash>.js` back to the file its worklet came from.
    if std::env::var("WORKLETS_WRITE_ORIGIN").is_ok() {
        return format!("// __workletOrigin: {filename}\n{}", printed.code);
    }
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
    let mut binding_props = builder.vec_with_capacity(closure_variables.len());

    let _ = (should_include_init_data, init_data_id);
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

    if !is_release(state.opts.env_name.as_deref()) {
        // Version resolution order, matching `workletFactory.ts:288, 448-452`:
        //   1. `WORKLETS_JEST_SHOULD_MOCK_VERSION=1` → MOCK_VERSION ("x.y.z")
        //   2. `opts.pluginVersion` (set by the JS shim from
        //      `react-native-worklets/package.json` at runtime)
        //   3. `REAL_VERSION` baked from `../package.json` at build time
        //
        // The baked fallback mirrors TS — the TS plugin lives inside the
        // worklets package so `REAL_VERSION` is always available; the Rust
        // build does the same lookup at compile time so raw napi callers
        // get a real version instead of a silently-missing `__pluginVersion`.
        let version: &str = if mock_version_active() {
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
    // Strip worklet-only directives recursively. Skipping only the top-level
    // directive (the old behaviour) left a stray `'no-worklet-closure'` /
    // `'limit-init-data-hoisting'` on any nested function/arrow that the
    // outer factory then printed verbatim.
    crate::utils::strip_worklet_directives_in_body(&mut body_clone, builder, true);
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

/// Scope-aware: does any identifier-reference in `body` resolve to the
/// function's own binding (not a shadowing inner declaration)?
///
/// A reference is considered self-recursive only when the symbol it binds to
/// lives **outside** the function's scope. Inner `let`/`function`/parameter
/// shadows (whose symbols live inside the function scope) are not real
/// self-references and must not trigger the `const <name> = this._recur;`
/// injection — doing so would mask the local in the workletized form.
///
/// References with no resolved symbol (unbound free identifiers) still count
/// as potential self-references — they may resolve to a parent scope binding
/// the codegen will later inject.
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
                    // Unresolved free identifier — assume the worklet body
                    // will resolve it against the same name at runtime.
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

fn scope_is_inside(scoping: &Scoping, inner: ScopeId, outer: ScopeId) -> bool {
    if inner == outer {
        return true;
    }
    scoping.scope_ancestors(inner).any(|s| s == outer)
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

