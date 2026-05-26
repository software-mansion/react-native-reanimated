use oxc_allocator::{Allocator, CloneIn};
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    Expression, FormalParameterKind, FunctionType, ObjectExpression, ObjectPropertyKind,
    PropertyKey, PropertyKind,
};
use oxc_ast_visit::Visit;
use oxc_span::SPAN;

pub const CONTEXT_OBJECT_MARKER: &str = "__workletContextObject";
pub const CONTEXT_OBJECT_FACTORY_KEY: &str = "__workletContextObjectFactory";

/// An ObjectExpression is *implicitly* a worklet context object if any of its
/// methods reference `this`. The plugin turns it into a self-cloning factory.
pub fn is_implicit_context_object(obj: &ObjectExpression<'_>) -> bool {
    obj.properties.iter().any(|p| {
        if let ObjectPropertyKind::ObjectProperty(prop) = p {
            if prop.method {
                if let Expression::FunctionExpression(func) = &prop.value {
                    if let Some(body) = &func.body {
                        let mut probe = ThisProbe { found: false };
                        probe.visit_function_body(body);
                        return probe.found;
                    }
                }
            }
        }
        false
    })
}

/// Whether the object already carries the marker. Used by the file-level
/// directive pass to short-circuit re-marking.
pub fn has_context_object_marker(obj: &ObjectExpression<'_>) -> bool {
    obj.properties.iter().any(|p| {
        if let ObjectPropertyKind::ObjectProperty(prop) = p {
            if let PropertyKey::StaticIdentifier(id) = &prop.key {
                return id.name.as_str() == CONTEXT_OBJECT_MARKER;
            }
        }
        false
    })
}

/// Strips the `__workletContextObject` marker (if present) and appends a
/// `__workletContextObjectFactory: function() { 'worklet'; return <cloned>; }`
/// property. Mirrors `processIfWorkletContextObject` in the babel plugin.
pub fn process_context_object<'a>(
    obj: &mut ObjectExpression<'a>,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
) -> bool {
    // Only act when the object is *explicitly* marked with
    // `__workletContextObject`. The babel plugin's `is_implicit_context_object`
    // detection (any method using `this`) is only run inside files that have
    // a top-level `'worklet'` directive — outside that, regular object
    // literals that happen to use `this` (e.g. mutable registries) must be
    // left alone, otherwise we accidentally turn them into worklet factories
    // and the runtime rejects them.
    if !has_context_object_marker(obj) {
        return false;
    }

    // Strip the marker
    let mut filtered = builder.vec_with_capacity(obj.properties.len());
    for p in obj.properties.drain(..) {
        let keep = match &p {
            ObjectPropertyKind::ObjectProperty(prop) => match &prop.key {
                PropertyKey::StaticIdentifier(id) => id.name.as_str() != CONTEXT_OBJECT_MARKER,
                _ => true,
            },
            _ => true,
        };
        if keep {
            filtered.push(p);
        }
    }
    obj.properties = filtered;

    // Build: function() { 'worklet'; return <cloned obj>; }
    let cloned_obj_expr = Expression::ObjectExpression(
        builder.alloc(obj.clone_in(allocator)),
    );

    let mut body_stmts = builder.vec_with_capacity(1);
    body_stmts.push(builder.statement_return(SPAN, Some(cloned_obj_expr)));
    let dir_str = builder.str("worklet");
    let directive = builder.directive(
        SPAN,
        builder.string_literal(SPAN, dir_str, None),
        dir_str,
    );
    let mut directives = builder.vec_with_capacity(1);
    directives.push(directive);
    let factory_body = builder.function_body(SPAN, directives, body_stmts);

    let params = builder.formal_parameters(
        SPAN,
        FormalParameterKind::FormalParameter,
        builder.vec(),
        NONE,
    );

    let factory_func = Expression::FunctionExpression(builder.alloc_function(
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
        Some(factory_body),
    ));

    let key = PropertyKey::StaticIdentifier(
        builder.alloc_identifier_name(SPAN, CONTEXT_OBJECT_FACTORY_KEY),
    );
    obj.properties
        .push(builder.object_property_kind_object_property(
            SPAN,
            PropertyKind::Init,
            key,
            factory_func,
            false,
            false,
            false,
        ));

    true
}

struct ThisProbe {
    found: bool,
}

impl<'a> Visit<'a> for ThisProbe {
    fn visit_this_expression(&mut self, _it: &oxc_ast::ast::ThisExpression) {
        self.found = true;
    }
    fn visit_function(&mut self, _func: &oxc_ast::ast::Function<'a>, _flags: oxc_syntax::scope::ScopeFlags) {
        // Don't descend into nested functions — they have their own `this`.
    }
    // Arrow functions transparently inherit this, so still visit them.

    fn visit_statement(&mut self, it: &oxc_ast::ast::Statement<'a>) {
        if self.found {
            return;
        }
        oxc_ast_visit::walk::walk_statement(self, it);
    }
}
