use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::ast::{
    Expression, FormalParameterKind, FunctionType, ObjectExpression, ObjectPropertyKind, Program,
    PropertyKey, PropertyKind,
};
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast_visit::{walk_mut, Visit, VisitMut};
use oxc_span::SPAN;

use crate::type_assertions::TypeAssertions;
use crate::utils::is_object_method;
use crate::utils::{has_worklet_directive, inject_worklet_directive};

const CONTEXT_OBJECT_MARKER: &str = "__workletContextObject";
const CONTEXT_OBJECT_FACTORY: &str = "__workletContextObjectFactory";

pub fn process_context_objects<'a>(
    program: &mut Program<'a>,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    assertions: &TypeAssertions,
) {
    ContextObjectPass {
        builder,
        allocator,
        assertions,
    }
    .visit_program(program);
}

struct ContextObjectPass<'a, 'b> {
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    assertions: &'b TypeAssertions,
}

impl<'a, 'b> VisitMut<'a> for ContextObjectPass<'a, 'b> {
    fn visit_function_body(&mut self, body: &mut oxc_ast::ast::FunctionBody<'a>) {
        if has_worklet_directive(body) {
            return;
        }
        walk_mut::walk_function_body(self, body);
    }

    fn visit_object_expression(&mut self, obj: &mut ObjectExpression<'a>) {
        if !is_context_object(obj, self.assertions) {
            walk_mut::walk_object_expression(self, obj);
            return;
        }
        remove_marker(obj, self.assertions);
        let original = obj.properties.len();
        append_factory(obj, self.builder, self.allocator);
        for prop in obj.properties.iter_mut().take(original) {
            self.visit_object_property_kind(prop);
        }
    }
}

pub fn is_context_object(obj: &ObjectExpression<'_>, assertions: &TypeAssertions) -> bool {
    obj.properties
        .iter()
        .any(|prop| assertions.is_named_data_property(prop, CONTEXT_OBJECT_MARKER))
}

pub fn append_marker<'a>(
    obj: &mut ObjectExpression<'a>,
    builder: AstBuilder<'a>,
    assertions: &TypeAssertions,
) {
    if is_context_object(obj, assertions) {
        return;
    }
    let key = PropertyKey::StaticIdentifier(
        builder.alloc_identifier_name(SPAN, builder.ident(CONTEXT_OBJECT_MARKER)),
    );
    let value = builder.expression_boolean_literal(SPAN, true);
    obj.properties
        .push(builder.object_property_kind_object_property(
            SPAN,
            PropertyKind::Init,
            key,
            value,
            false,
            false,
            false,
        ));
}

/// Mirrors `isImplicitContextObject` in `plugin/src/file.ts` — an object is an
/// implicit context object when any of its methods reaches for `this`.
pub fn is_implicit_context_object(obj: &ObjectExpression<'_>) -> bool {
    obj.properties.iter().any(|prop| {
        let ObjectPropertyKind::ObjectProperty(prop) = prop else {
            return false;
        };
        if !is_object_method(prop) {
            return false;
        }
        let Expression::FunctionExpression(func) = &prop.value else {
            return false;
        };
        let mut probe = ThisProbe { found: false };
        probe.visit_property_key(&prop.key);
        probe.visit_formal_parameters(&func.params);
        if let Some(body) = func.body.as_ref() {
            probe.visit_function_body(body);
        }
        probe.found
    })
}

fn remove_marker(obj: &mut ObjectExpression<'_>, assertions: &TypeAssertions) {
    obj.properties
        .retain(|prop| !assertions.is_named_data_property(prop, CONTEXT_OBJECT_MARKER));
}

fn append_factory<'a>(
    obj: &mut ObjectExpression<'a>,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
) {
    let mut cloned = builder.vec_with_capacity(obj.properties.len());
    for prop in obj.properties.iter() {
        cloned.push(prop.clone_in(allocator));
    }

    let mut stmts = builder.vec_with_capacity(1);
    stmts.push(builder.statement_return(SPAN, Some(builder.expression_object(SPAN, cloned))));
    let mut body = builder.function_body(SPAN, builder.vec(), stmts);
    inject_worklet_directive(&mut body, builder);

    let params = builder.formal_parameters(
        SPAN,
        FormalParameterKind::FormalParameter,
        builder.vec(),
        NONE,
    );
    let factory = Expression::FunctionExpression(builder.alloc_function(
        SPAN,
        FunctionType::FunctionExpression,
        None,
        false,
        false,
        false,
        NONE,
        NONE,
        params,
        NONE,
        Some(body),
    ));

    let key = PropertyKey::StaticIdentifier(
        builder.alloc_identifier_name(SPAN, builder.ident(CONTEXT_OBJECT_FACTORY)),
    );
    obj.properties
        .push(builder.object_property_kind_object_property(
            SPAN,
            PropertyKind::Init,
            key,
            factory,
            false,
            false,
            false,
        ));
}

struct ThisProbe {
    found: bool,
}

impl<'a> oxc_ast_visit::Visit<'a> for ThisProbe {
    fn visit_this_expression(&mut self, _: &oxc_ast::ast::ThisExpression) {
        self.found = true;
    }
}
