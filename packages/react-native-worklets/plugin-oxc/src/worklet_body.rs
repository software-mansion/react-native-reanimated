use std::path::{Path, PathBuf};

use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    BindingPattern, Expression, FormalParameters, FunctionBody, FunctionType, PropertyKey,
    Statement, VariableDeclarationKind,
};
use oxc_codegen::{Codegen, CodegenOptions};
use oxc_semantic::SemanticBuilder;
use oxc_span::SPAN;
use oxc_transformer::{
    ArrowFunctionsOptions, ClassPropertiesOptions, ES2015Options, ES2020Options, ES2022Options,
    EnvOptions, TransformOptions, Transformer,
};

use crate::transformer::builders::no_rest;

pub struct WorkletBodyOutput {
    pub code: String,
    pub source_map_json: Option<String>,
}

/// Build the stringified worklet body that lives in `__initData.code`.
/// When `source_map_path` is `Some`, also emits a JSON source-map string
/// for `__initData.sourceMap`, with `sources_content` populated from
/// `original_source_text` so consumers (Flipper, devtools) can symbolicate
/// without having to read the file from disk.
pub fn build_worklet_body_string<'a>(
    worklet_name: &str,
    params: &FormalParameters<'a>,
    body: &FunctionBody<'a>,
    is_expression_body: bool,
    closure_variables: &[String],
    recursive_name: Option<&str>,
    allocator: &'a Allocator,
    source_map_path: Option<&str>,
    original_source_text: Option<&str>,
) -> WorkletBodyOutput {
    let builder = AstBuilder::new(allocator);

    let cloned_params: FormalParameters<'a> = params.clone_in(allocator);
    let mut cloned_body: FunctionBody<'a> = body.clone_in(allocator);
    cloned_body.directives = builder.vec();
    if is_expression_body {
        rewrite_implicit_return(&mut cloned_body, builder);
    }

    let mut prepended: Vec<Statement<'a>> = Vec::with_capacity(2);
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
        false,
        false,
        false,
        NONE,
        NONE,
        cloned_params,
        NONE,
        Some(cloned_body),
    );

    let mut stmts = builder.vec_with_capacity(1);
    stmts.push(Statement::FunctionDeclaration(fun));
    let mut program = builder.program(
        SPAN,
        oxc_span::SourceType::default(),
        "",
        builder.vec(),
        None,
        builder.vec(),
        stmts,
    );

    // Lower modern syntax so the body string can run in conservative worklet
    // runtimes (pre-Hermes JSC, etc.). Matches the subset of transforms that
    // babel-plugin-worklets runs over the worklet body.
    lower_worklet_body(allocator, &mut program);

    let options = CodegenOptions {
        minify: true,
        source_map_path: source_map_path.map(PathBuf::from),
        ..Default::default()
    };
    let ret = Codegen::new().with_options(options).build(&program);
    let source_map_json = ret.map.map(|mut m| {
        if let Some(src) = original_source_text {
            m.set_source_contents(vec![Some(src)]);
        }
        m.to_json_string()
    });
    WorkletBodyOutput {
        code: ret.code,
        source_map_json,
    }
}

/// Run the oxc transformer over the synthesized body program, lowering the
/// subset of modern syntax that older worklet runtimes (pre-Hermes JSC) may
/// not support. Mirrors `babel-plugin-worklets`' `extraPlugins` list, modulo
/// what oxc supports at our pinned version:
///   * arrow functions       ✓ via `ArrowFunctionConverter`
///   * optional chaining     ✓ via `es2020.optional_chaining`
///   * nullish coalescing    ✓ via `es2020.nullish_coalescing_operator`
///   * class properties      ✓ via `es2022.class_properties`
/// Not yet available in this oxc version:
///   * template literals
///   * ES6 class declarations themselves
///   * shorthand properties
fn lower_worklet_body<'a>(allocator: &'a Allocator, program: &mut oxc_ast::ast::Program<'a>) {
    // Semantic info is required by the transformer.
    let scoping = SemanticBuilder::new()
        .with_check_syntax_error(false)
        .build(program)
        .semantic
        .into_scoping();

    let env = EnvOptions {
        es2015: ES2015Options {
            arrow_function: Some(ArrowFunctionsOptions::default()),
        },
        es2020: ES2020Options {
            nullish_coalescing_operator: true,
            optional_chaining: true,
            ..Default::default()
        },
        es2022: ES2022Options {
            class_properties: Some(ClassPropertiesOptions::default()),
            ..Default::default()
        },
        ..Default::default()
    };

    let options = TransformOptions {
        env,
        ..Default::default()
    };

    let _ = Transformer::new(allocator, Path::new("worklet-body.js"), &options)
        .build_with_scoping(scoping, program);
}

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
