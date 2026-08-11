use oxc_ast::AstBuilder;
use oxc_ast::ast::{Class, ClassBody, ClassElement, PropertyKey};

pub const WORKLET_CLASS_MARKER: &str = "__workletClass";

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
