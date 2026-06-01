use std::path::PathBuf;

use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    BindingPattern, Expression, FormalParameters, FunctionBody, FunctionType, PropertyKey,
    Statement, VariableDeclarationKind,
};
use oxc_codegen::{Codegen, CodegenOptions};
use oxc_span::SPAN;

use crate::transformer::builders::no_rest;
use crate::utils::rewrite_implicit_return;

pub struct WorkletBodyOutput {
    pub code: String,
    pub source_map_json: Option<String>,
}

/// Build the stringified worklet body that lives in `__initData.code`.
/// When `source_map_path` is `Some`, also emits a JSON source-map string for
/// `__initData.sourceMap`. We deliberately do NOT include `sources_content`
/// (despite oxc making it available) to match `workletStringCode.ts:161`,
/// which strips it for bandwidth — a file with many worklets would otherwise
/// embed the full source text once per worklet.
pub fn build_worklet_body_string<'a>(
    worklet_name: &str,
    params: &FormalParameters<'a>,
    body: &FunctionBody<'a>,
    is_async: bool,
    is_generator: bool,
    is_expression_body: bool,
    closure_variables: &[String],
    recursive_name: Option<&str>,
    rewritten_classes: &[String],
    allocator: &'a Allocator,
    source_map_path: Option<&str>,
    original_source_text: &'a str,
) -> WorkletBodyOutput {
    let builder = AstBuilder::new(allocator);

    let cloned_params: FormalParameters<'a> = params.clone_in(allocator);
    let mut cloned_body: FunctionBody<'a> = body.clone_in(allocator);
    // Strip every worklet-only directive *recursively* — top-level `worklet`
    // (which would round-trip into `__initData.code` and cause double
    // workletization on eval) as well as nested `no-worklet-closure` /
    // `limit-init-data-hoisting` directives on inner functions whose bodies
    // are now part of our stringified output.
    crate::utils::strip_worklet_directives_in_body(&mut cloned_body, builder);
    if is_expression_body {
        rewrite_implicit_return(&mut cloned_body, builder);
    }

    let mut prepended: Vec<Statement<'a>> = Vec::with_capacity(2 + rewritten_classes.len());
    if let Some(name) = recursive_name {
        // `const <name> = this._recur;` — so recursive calls inside the
        // workletized function resolve to the bound worklet function on the
        // UI thread. Mirrors `prependRecursiveDeclaration` in
        // babel-plugin-worklets.
        prepended.push(build_recur_binding(builder, name));
    }
    if !closure_variables.is_empty() {
        prepended.push(build_closure_destructure(builder, closure_variables));
    }
    // Rebuild any captured worklet-class bindings:
    //   const Foo = Foo__classFactory();
    // Mirrors workletStringCode.ts NewExpression handling. Must come AFTER
    // the closure destructure (which introduces `Foo__classFactory`).
    for base_name in rewritten_classes {
        prepended.push(build_class_factory_init(builder, base_name));
    }
    if !prepended.is_empty() {
        let mut new_stmts = builder.vec_with_capacity(cloned_body.statements.len() + prepended.len());
        for s in prepended {
            new_stmts.push(s);
        }
        for s in cloned_body.statements.drain(..) {
            new_stmts.push(s);
        }
        cloned_body.statements = new_stmts;
    }

    let id_name = builder.ident(worklet_name);
    let id = builder.binding_identifier(SPAN, id_name);

    let fun = builder.alloc_function(
        SPAN,
        FunctionType::FunctionDeclaration,
        Some(id),
        is_generator,
        is_async,
        false,
        NONE,
        NONE,
        cloned_params,
        NONE,
        Some(cloned_body),
    );

    let mut stmts = builder.vec_with_capacity(1);
    stmts.push(Statement::FunctionDeclaration(fun));
    // The cloned function nodes still carry spans into the original source
    // file. oxc_codegen's source-map builder reads bytes at those spans, so
    // the mini-program must be created with the real source text — passing
    // `""` panics in debug and corrupts source-map tokens in release.
    let program = builder.program(
        SPAN,
        oxc_span::SourceType::default(),
        original_source_text,
        builder.vec(),
        None,
        builder.vec(),
        stmts,
    );

    // No lowering pass: bundle-only mode emits the worklet body verbatim
    // into a regular JS file that goes through Metro / the host bundler,
    // which handles modern syntax natively. The body string this function
    // produces is used only for hashing — the actual emitted code uses the
    // raw AST nodes (see `build_inner_fn_decl`).
    let _ = allocator;

    let options = CodegenOptions {
        minify: true,
        source_map_path: source_map_path.map(PathBuf::from),
        ..Default::default()
    };
    let ret = Codegen::new().with_options(options).build(&program);
    let source_map_json = ret.map.map(|m| m.to_json_string());
    WorkletBodyOutput {
        code: ret.code,
        source_map_json,
    }
}


/// Build `const <base> = <base>__classFactory();` — re-instantiates a
/// captured worklet class on the UI thread.
fn build_class_factory_init<'a>(builder: AstBuilder<'a>, base_name: &str) -> Statement<'a> {
    let factory_name = format!("{base_name}__classFactory");
    let factory_ident = builder.ident(&factory_name);
    let call = builder.expression_call(
        SPAN,
        builder.expression_identifier(SPAN, factory_ident),
        NONE,
        builder.vec(),
        false,
    );
    let id_pat = builder.binding_pattern_binding_identifier(SPAN, builder.ident(base_name));
    let declarator = builder.variable_declarator(
        SPAN,
        VariableDeclarationKind::Const,
        id_pat,
        NONE,
        Some(call),
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

/// Build `const <name> = this._recur;`.
fn build_recur_binding<'a>(builder: AstBuilder<'a>, name: &str) -> Statement<'a> {
    let ident = builder.ident(name);
    let id_pat = builder.binding_pattern_binding_identifier(SPAN, ident);
    let this_recur = Expression::from(builder.member_expression_static(
        SPAN,
        builder.expression_this(SPAN),
        builder.identifier_name(SPAN, "_recur"),
        false,
    ));
    let declarator = builder.variable_declarator(
        SPAN,
        VariableDeclarationKind::Const,
        id_pat,
        NONE,
        Some(this_recur),
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

fn build_closure_destructure<'a>(
    builder: AstBuilder<'a>,
    closure_variables: &[String],
) -> Statement<'a> {
    let mut binding_props = builder.vec_with_capacity(closure_variables.len());
    for name in closure_variables {
        let ident = builder.ident(name);
        let key = PropertyKey::StaticIdentifier(builder.alloc_identifier_name(SPAN, ident));
        let value = builder.binding_pattern_binding_identifier(SPAN, ident);
        binding_props.push(builder.binding_property(SPAN, key, value, true, false));
    }

    let object_pattern: BindingPattern<'a> =
        builder.binding_pattern_object_pattern(SPAN, binding_props, no_rest());

    let this_closure = Expression::from(builder.member_expression_static(
        SPAN,
        builder.expression_this(SPAN),
        builder.identifier_name(SPAN, "__closure"),
        false,
    ));

    let declarator = builder.variable_declarator(
        SPAN,
        VariableDeclarationKind::Const,
        object_pattern,
        NONE,
        Some(this_closure),
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
