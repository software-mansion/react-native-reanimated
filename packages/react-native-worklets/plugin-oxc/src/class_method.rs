use oxc_allocator::CloneIn;
use oxc_ast::ast::{
    ClassElement, MethodDefinition, MethodDefinitionKind, PropertyDefinitionType, PropertyKey,
};
use oxc_ast::NONE;
use oxc_span::SPAN;
use oxc_syntax::scope::ScopeFlags;

use crate::plugin::WorkletPass;
use crate::utils::has_worklet_directive;

pub enum MethodOutcome<'a> {
    NotAWorklet,
    Rejected,
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
    if method.kind != MethodDefinitionKind::Method
        || matches!(method.key, PropertyKey::PrivateIdentifier(_))
    {
        reject(pass, method);
        return MethodOutcome::Rejected;
    }

    let self_name = match &method.key {
        PropertyKey::StaticIdentifier(id) if !method.computed => Some(id.name.to_string()),
        _ => None,
    };
    let injected = pass.walk_function_scoped(&mut method.value, ScopeFlags::Function);
    let Some((factory_call, _)) =
        pass.workletize_function(&method.value, self_name.as_deref(), &injected)
    else {
        pass.record_injected_refs(injected);
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

fn reject(pass: &mut WorkletPass<'_, '_>, method: &MethodDefinition<'_>) {
    if pass.state.error.is_some() {
        return;
    }
    if method.kind == MethodDefinitionKind::Constructor {
        pass.state.error = Some("a class constructor cannot be a worklet".to_string());
        return;
    }
    let kind = match method.kind {
        MethodDefinitionKind::Get => "class getter",
        MethodDefinitionKind::Set => "class setter",
        _ => "class method",
    };
    let name = match &method.key {
        PropertyKey::StaticIdentifier(id) => id.name.to_string(),
        PropertyKey::PrivateIdentifier(id) => format!("#{}", id.name),
        _ => "<computed>".to_string(),
    };
    pass.state.error = Some(format!(
        "the `{name}` {kind} cannot be a worklet. Use a class field with an arrow \
         function instead."
    ));
}
