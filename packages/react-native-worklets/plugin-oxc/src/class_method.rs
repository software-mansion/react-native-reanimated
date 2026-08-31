use oxc_allocator::CloneIn;
use oxc_ast::ast::{ClassElement, MethodDefinition, PropertyDefinitionType, PropertyKey};
use oxc_ast::NONE;
use oxc_ast_visit::walk_mut;
use oxc_span::SPAN;
use oxc_syntax::scope::ScopeFlags;

use crate::utils::has_worklet_directive;
use crate::worklet_pass::WorkletPass;

pub enum MethodOutcome<'a> {
    NotAWorklet,
    Workletized(ClassElement<'a>),
}

pub fn process_if_worklet_method<'a>(
    pass: &mut WorkletPass<'a, '_>,
    method: &mut MethodDefinition<'a>,
) -> MethodOutcome<'a> {
    if !method
        .value
        .body
        .as_ref()
        .is_some_and(|body| has_worklet_directive(body))
    {
        return MethodOutcome::NotAWorklet;
    }
    if !method.kind.is_method() || matches!(method.key, PropertyKey::PrivateIdentifier(_)) {
        return MethodOutcome::NotAWorklet;
    }

    let self_name = match &method.key {
        PropertyKey::StaticIdentifier(id) if !method.computed => Some(id.name.as_str()),
        _ => None,
    };
    walk_mut::walk_function(pass, &mut method.value, ScopeFlags::Function);
    let Some((factory_call, _)) = pass.try_workletize_function(&method.value, self_name, true)
    else {
        return MethodOutcome::NotAWorklet;
    };

    MethodOutcome::Workletized(pass.builder.class_element_property_definition(
        SPAN,
        PropertyDefinitionType::PropertyDefinition,
        pass.builder.vec(),
        method.key.clone_in(pass.allocator),
        NONE,
        Some(factory_call),
        method.computed,
        method.r#static,
        false,
        false,
        false,
        false,
        false,
        None,
    ))
}
