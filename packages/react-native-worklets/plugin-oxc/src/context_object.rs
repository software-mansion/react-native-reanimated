use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    Expression, FormalParameterKind, FunctionType, ObjectExpression, ObjectPropertyKind,
    PropertyKey, PropertyKind, Program,
};
use oxc_ast_visit::{Visit, VisitMut, walk_mut};
use oxc_span::SPAN;

use crate::utils::inject_worklet_directive;

pub const CONTEXT_OBJECT_MARKER: &str = "__workletContextObject";
const CONTEXT_OBJECT_FACTORY: &str = "__workletContextObjectFactory";

pub fn process_context_objects<'a>(
    program: &mut Program<'a>,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
) {
    ContextObjectPass { builder, allocator }.visit_program(program);
}

struct ContextObjectPass<'a> {
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
}

impl<'a> VisitMut<'a> for ContextObjectPass<'a> {
    fn visit_object_expression(&mut self, obj: &mut ObjectExpression<'a>) {
        if !is_context_object(obj) {
            walk_mut::walk_object_expression(self, obj);
            return;
        }
        remove_marker(obj, self.builder);
        append_factory(obj, self.builder, self.allocator);
        // The appended factory carries a clone of the object as it stood, and
        // Babel's pre-order traversal never revisits a node it just pushed.
        let original = obj.properties.len() - 1;
        for prop in obj.properties.iter_mut().take(original) {
            self.visit_object_property_kind(prop);
        }
    }
}

pub fn is_context_object(obj: &ObjectExpression<'_>) -> bool {
    obj.properties.iter().any(is_marker_property)
}

pub fn append_marker<'a>(obj: &mut ObjectExpression<'a>, builder: AstBuilder<'a>) {
    if is_context_object(obj) {
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
        func.body.as_ref().is_some_and(|body| {
            let mut probe = ThisProbe { found: false };
            probe.visit_function_body(body);
            probe.found
        })
    })
}

/// Babel's `isObjectMethod()` covers shorthand methods and accessors alike.
pub fn is_object_method(prop: &oxc_ast::ast::ObjectProperty<'_>) -> bool {
    prop.method || prop.kind != PropertyKind::Init
}

fn is_marker_property(prop: &ObjectPropertyKind<'_>) -> bool {
    let ObjectPropertyKind::ObjectProperty(prop) = prop else {
        return false;
    };
    if prop.method {
        return false;
    }
    matches!(&prop.key, PropertyKey::StaticIdentifier(id) if id.name.as_str() == CONTEXT_OBJECT_MARKER)
}

fn remove_marker<'a>(obj: &mut ObjectExpression<'a>, builder: AstBuilder<'a>) {
    let old = std::mem::replace(&mut obj.properties, builder.vec());
    let mut kept = builder.vec_with_capacity(old.len());
    for prop in old {
        if !is_marker_property(&prop) {
            kept.push(prop);
        }
    }
    obj.properties = kept;
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
    stmts.push(
        builder.statement_return(SPAN, Some(builder.expression_object(SPAN, cloned))),
    );
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
