//! Worklet class support.
//!
//! The babel plugin first polyfills modern class syntax via
//! `@babel/plugin-transform-classes` and friends, then converts the
//! polyfilled class into a `<ClassName>__classFactory` function returned
//! from an IIFE. Because oxc does not expose a callable "lower classes
//! only" pass, we emit the simpler form documented in the worklet runtime
//! contract: leave the `class Foo { … }` declaration intact (modern
//! Hermes / web JSC handles ES6 classes natively) and wrap it in a
//! `function Foo__classFactory() { class Foo { … }; Foo.Foo__classFactory =
//! Foo__classFactory; return Foo; }` factory.
//!
//! The replacement statement is `const Foo = Foo__classFactory();`.
//!
//! KNOWN LIMITATION vs babel-plugin-worklets: worklet runtimes still on
//! pre-Hermes JSC that don't grok native ES6 `class` syntax will not be able
//! to evaluate the body string for classes declared with modern syntax.
//! Modern Hermes and Web JSC are unaffected. Class-fields *inside* a worklet
//! body still get lowered by `worklet_body.rs::lower_worklet_body` (oxc
//! supports that pass), so `x = 1;` on a class member declared inside a
//! worklet body works.

use oxc_allocator::CloneIn;
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    AssignmentOperator, AssignmentTarget, Class, ClassBody, ClassElement, Expression,
    FormalParameterKind, FunctionType, PropertyKey, Statement, VariableDeclarationKind,
};
use oxc_span::SPAN;

const WORKLET_CLASS_MARKER: &str = "__workletClass";
const CLASS_FACTORY_SUFFIX: &str = "__classFactory";

/// True if the class body contains a static `__workletClass` property.
/// The file-level directive pass injects this marker on every top-level
/// class when `'worklet'` is the program directive.
pub fn is_worklet_class(class: &Class<'_>) -> bool {
    class.body.body.iter().any(|el| {
        if let ClassElement::PropertyDefinition(prop) = el {
            if let PropertyKey::StaticIdentifier(id) = &prop.key {
                return id.name.as_str() == WORKLET_CLASS_MARKER;
            }
        }
        false
    })
}

/// Strip the `__workletClass` marker property from the class body.
pub fn remove_worklet_class_marker<'a>(body: &mut ClassBody<'a>, builder: AstBuilder<'a>) {
    let kept: Vec<_> = body
        .body
        .drain(..)
        .filter(|el| match el {
            ClassElement::PropertyDefinition(prop) => match &prop.key {
                PropertyKey::StaticIdentifier(id) => id.name.as_str() != WORKLET_CLASS_MARKER,
                _ => true,
            },
            _ => true,
        })
        .collect();
    let mut new_body = builder.vec_with_capacity(kept.len());
    for el in kept {
        new_body.push(el);
    }
    body.body = new_body;
}

/// Wraps `class Foo { … }` (with the marker stripped) into a factory:
///
/// ```text
/// function Foo__classFactory() {
///   const Foo = class Foo { … };
///   Foo.Foo__classFactory = Foo__classFactory;
///   return Foo;
/// }
/// const Foo = Foo__classFactory();
/// ```
///
/// Returns `(factory_decl_statement, call_decl_statement)`. The caller
/// substitutes the original class declaration with these two statements.
pub fn build_class_factory_pair<'a>(
    class: &mut Class<'a>,
    class_name: &str,
    builder: AstBuilder<'a>,
    allocator: &'a oxc_allocator::Allocator,
) -> Option<(Statement<'a>, Statement<'a>)> {
    remove_worklet_class_marker(&mut class.body, builder);

    let factory_name = format!("{class_name}{CLASS_FACTORY_SUFFIX}");

    // Clone the class so we can reuse a copy inside the factory body.
    let cloned_class = class.clone_in(allocator);

    // Inner: const Foo = class Foo { … };
    let class_expr = Expression::ClassExpression(builder.alloc(cloned_class));
    let id_pat = builder.binding_pattern_binding_identifier(SPAN, builder.ident(class_name));
    let decl = builder.variable_declarator(
        SPAN,
        VariableDeclarationKind::Const,
        id_pat,
        NONE,
        Some(class_expr),
        false,
    );
    let mut decls = builder.vec_with_capacity(1);
    decls.push(decl);
    let inner_const = Statement::VariableDeclaration(
        builder.alloc_variable_declaration(SPAN, VariableDeclarationKind::Const, decls, false),
    );

    // Foo.Foo__classFactory = Foo__classFactory;
    let assign_target = AssignmentTarget::from(builder.member_expression_static(
        SPAN,
        builder.expression_identifier(SPAN, builder.ident(class_name)),
        builder.identifier_name(SPAN, builder.ident(&factory_name)),
        false,
    ));
    let assign_val = builder.expression_identifier(SPAN, builder.ident(&factory_name));
    let assign_stmt = builder.statement_expression(
        SPAN,
        builder.expression_assignment(SPAN, AssignmentOperator::Assign, assign_target, assign_val),
    );

    // return Foo;
    let return_stmt = builder.statement_return(
        SPAN,
        Some(builder.expression_identifier(SPAN, builder.ident(class_name))),
    );

    // 'worklet' directive on body
    let dir_str = builder.str("worklet");
    let directive = builder.directive(
        SPAN,
        builder.string_literal(SPAN, dir_str, None),
        dir_str,
    );
    let mut directives = builder.vec_with_capacity(1);
    directives.push(directive);

    let mut body_stmts = builder.vec_with_capacity(3);
    body_stmts.push(inner_const);
    body_stmts.push(assign_stmt);
    body_stmts.push(return_stmt);
    let body = builder.function_body(SPAN, directives, body_stmts);

    let params = builder.formal_parameters(
        SPAN,
        FormalParameterKind::FormalParameter,
        builder.vec(),
        NONE,
    );

    // function Foo__classFactory() { … }
    let factory_id = builder.binding_identifier(SPAN, builder.ident(&factory_name));
    let factory_decl = Statement::FunctionDeclaration(builder.alloc_function(
        SPAN,
        FunctionType::FunctionDeclaration,
        Some(factory_id),
        false,
        false,
        false,
        NONE,
        NONE,
        params,
        NONE,
        Some(body),
    ));

    // const Foo = Foo__classFactory();
    let call = builder.expression_call(
        SPAN,
        builder.expression_identifier(SPAN, builder.ident(&factory_name)),
        NONE,
        builder.vec(),
        false,
    );
    let id_pat2 = builder.binding_pattern_binding_identifier(SPAN, builder.ident(class_name));
    let decl2 = builder.variable_declarator(
        SPAN,
        VariableDeclarationKind::Const,
        id_pat2,
        NONE,
        Some(call),
        false,
    );
    let mut decls2 = builder.vec_with_capacity(1);
    decls2.push(decl2);
    let const_decl = Statement::VariableDeclaration(
        builder.alloc_variable_declaration(SPAN, VariableDeclarationKind::Const, decls2, false),
    );

    Some((factory_decl, const_decl))
}
