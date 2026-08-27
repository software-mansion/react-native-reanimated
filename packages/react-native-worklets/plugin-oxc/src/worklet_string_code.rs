use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::ast::{Expression, FormalParameters, FunctionBody, FunctionType, Statement};
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_codegen::{Codegen, CodegenOptions};
use oxc_span::SPAN;

use crate::utils::{closure_binding_pattern, const_decl, replace_implicit_return_with_block};
use crate::worklet_factory::WorkletInput;

pub fn build_worklet_string<'a>(
    worklet_name: &str,
    input: &WorkletInput<'a, '_>,
    closure_variables: &[String],
    recursive_name: Option<&str>,
    allocator: &'a Allocator,
    original_source_text: &'a str,
) -> String {
    let builder = AstBuilder::new(allocator);

    let cloned_params: FormalParameters<'a> = input.params.clone_in(allocator);
    let mut cloned_body: FunctionBody<'a> = input.body.clone_in(allocator);
    crate::utils::strip_worklet_directives(&mut cloned_body, builder, false);
    if input.is_expression_body {
        replace_implicit_return_with_block(&mut cloned_body, builder);
    }

    if !closure_variables.is_empty() {
        let destructure = prepend_closure(builder, closure_variables);
        cloned_body.statements.insert(0, destructure);
    }
    if let Some(name) = recursive_name {
        cloned_body
            .statements
            .insert(0, prepend_recursive_declaration(builder, name));
    }

    let id_name = builder.ident(worklet_name);
    let id = builder.binding_identifier(SPAN, id_name);

    let fun = builder.alloc_function(
        SPAN,
        FunctionType::FunctionDeclaration,
        Some(id),
        input.is_generator,
        input.is_async,
        false,
        NONE,
        NONE,
        cloned_params,
        NONE,
        Some(cloned_body),
    );

    let stmts = builder.vec1(Statement::FunctionDeclaration(fun));
    let program = builder.program(
        SPAN,
        oxc_span::SourceType::default(),
        original_source_text,
        builder.vec(),
        None,
        builder.vec(),
        stmts,
    );

    let options = CodegenOptions {
        minify: true,
        ..Default::default()
    };
    Codegen::new().with_options(options).build(&program).code
}

fn prepend_recursive_declaration<'a>(builder: AstBuilder<'a>, name: &str) -> Statement<'a> {
    let ident = builder.ident(name);
    let id_pat = builder.binding_pattern_binding_identifier(SPAN, ident);
    let this_recur = Expression::from(builder.member_expression_static(
        SPAN,
        builder.expression_this(SPAN),
        builder.identifier_name(SPAN, "_recur"),
        false,
    ));
    const_decl(builder, id_pat, this_recur)
}

/// Prepends necessary closure variables to the worklet function.
fn prepend_closure<'a>(builder: AstBuilder<'a>, closure_variables: &[String]) -> Statement<'a> {
    let object_pattern = closure_binding_pattern(builder, closure_variables);

    let this_closure = Expression::from(builder.member_expression_static(
        SPAN,
        builder.expression_this(SPAN),
        builder.identifier_name(SPAN, "__closure"),
        false,
    ));

    const_decl(builder, object_pattern, this_closure)
}
