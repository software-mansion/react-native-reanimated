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
    original_source_text: &'a str,
) -> String {
    let builder = AstBuilder::new(allocator);

    let cloned_params: FormalParameters<'a> = params.clone_in(allocator);
    let mut cloned_body: FunctionBody<'a> = body.clone_in(allocator);
    crate::utils::strip_worklet_directives_in_body(&mut cloned_body, builder, false);
    if is_expression_body {
        rewrite_implicit_return(&mut cloned_body, builder);
    }

    let mut prepended: Vec<Statement<'a>> = Vec::with_capacity(2 + rewritten_classes.len());
    if let Some(name) = recursive_name {
        prepended.push(build_recur_binding(builder, name));
    }
    if !closure_variables.is_empty() {
        prepended.push(build_closure_destructure(builder, closure_variables));
    }
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
    let program = builder.program(
        SPAN,
        oxc_span::SourceType::default(),
        original_source_text,
        builder.vec(),
        None,
        builder.vec(),
        stmts,
    );

    let _ = allocator;

    let options = CodegenOptions {
        minify: true,
        ..Default::default()
    };
    Codegen::new().with_options(options).build(&program).code
}

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
