use std::collections::HashSet;

use oxc_ast::ast::{
    AssignmentTarget, AssignmentTargetPropertyIdentifier, ForInStatement, ForOfStatement,
    ForStatementLeft, IdentifierReference,
};
use oxc_ast_visit::{walk, Visit};
use oxc_semantic::Scoping;
use oxc_syntax::reference::ReferenceFlags;
use oxc_syntax::scope::ScopeId;
use oxc_syntax::symbol::SymbolId;

use crate::types::{binding_is_rebound, ImportInfo, ImportShape, State};
use crate::utils::{assignment_identifier, can_forward_module_import, can_forward_relative_import};
use crate::worklet_factory::WorkletInput;

#[derive(Debug, Default)]
pub struct ClosureResult {
    pub closure_variables: Vec<String>,
    pub imports: Vec<ImportInfo>,
}

pub type InjectedRef = (String, ScopeId);

pub fn get_closure<'a>(
    input: &WorkletInput<'a, '_>,
    scoping: &Scoping,
    state: &State,
    force_capture: &HashSet<InjectedRef>,
    filename: &str,
) -> ClosureResult {
    let WorkletInput {
        function_scope_id,
        self_name: self_function_name,
        ..
    } = *input;
    let mut collector = ReferenceCollector {
        scoping,
        refs: Vec::new(),
        in_for_target: false,
    };
    collector.visit_function_body(input.body);
    collector.visit_formal_parameters(input.params);

    let mut seen: HashSet<String> = HashSet::new();
    let mut result = ClosureResult::default();

    for r in collector.refs {
        if r.flags.is_type_only() {
            continue;
        }
        if seen.contains(&r.name) {
            continue;
        }

        match r.symbol_id {
            Some(symbol_id) => {
                let symbol_scope = scoping.symbol_scope_id(symbol_id);
                if scope_is_inside(scoping, symbol_scope, function_scope_id) {
                    continue;
                }
                // We must handle recursion and
                // not capture the function itself.
                if let Some(fn_name) = self_function_name {
                    if fn_name == r.name && scoping.symbol_name(symbol_id) == fn_name {
                        continue;
                    }
                }

                let flags = scoping.symbol_flags(symbol_id);
                if flags.is_import() && !binding_is_rebound(scoping, symbol_id) {
                    if let Some(info) = state.imports_by_symbol.get(&symbol_id) {
                        if matches!(info.shape, ImportShape::Namespace) {
                            seen.insert(r.name.clone());
                            result.closure_variables.push(r.name);
                            continue;
                        }
                        let source = &info.source;
                        let is_rel = source.starts_with('.');
                        let allowed_for_rel = is_rel
                            && can_forward_relative_import(
                                filename,
                                &state.forwardable_relative_paths,
                            );
                        let lib_workletizable = !is_rel
                            && can_forward_module_import(source, &state.forwardable_module_names);
                        if allowed_for_rel || lib_workletizable {
                            result.imports.push(info.clone());
                            seen.insert(r.name);
                            continue;
                        }
                    }
                }

                seen.insert(r.name.clone());
                result.closure_variables.push(r.name);
            }
            None => {
                let mut injected_scopes = force_capture
                    .iter()
                    .filter(|(name, _)| *name == r.name)
                    .map(|(_, scope)| *scope)
                    .peekable();
                let is_injected = injected_scopes.peek().is_some();

                let resolves_outside = if is_injected && r.is_synthesized_node {
                    injected_scopes
                        .any(|scope| binding_is_outside(scoping, scope, &r.name, function_scope_id))
                } else {
                    binding_is_outside(scoping, function_scope_id, &r.name, function_scope_id)
                };
                if !resolves_outside {
                    continue;
                }

                if self_function_name == Some(r.name.as_str()) {
                    continue;
                }
                if !is_injected && !is_synthesized_init_data(&r.name) {
                    continue;
                }
                seen.insert(r.name.clone());
                result.closure_variables.push(r.name);
            }
        }
    }

    result
}

fn is_synthesized_init_data(name: &str) -> bool {
    let Some(rest) = name.strip_prefix("_worklet_") else {
        return false;
    };
    let Some(digits) = rest.strip_suffix("_init_data") else {
        return false;
    };
    !digits.is_empty() && digits.bytes().all(|b| b.is_ascii_digit())
}

fn binding_is_outside(
    scoping: &Scoping,
    lookup_from: ScopeId,
    name: &str,
    function_scope_id: ScopeId,
) -> bool {
    match scoping.find_binding(lookup_from, name.into()) {
        Some(symbol_id) => !scope_is_inside(
            scoping,
            scoping.symbol_scope_id(symbol_id),
            function_scope_id,
        ),
        None => true,
    }
}

pub fn scope_is_inside(scoping: &Scoping, inner: ScopeId, outer: ScopeId) -> bool {
    if inner == outer {
        return true;
    }
    scoping.scope_ancestors(inner).any(|s| s == outer)
}

#[derive(Debug)]
struct CollectedRef {
    name: String,
    symbol_id: Option<SymbolId>,
    flags: ReferenceFlags,
    is_synthesized_node: bool,
}

struct ReferenceCollector<'s> {
    scoping: &'s Scoping,
    refs: Vec<CollectedRef>,
    in_for_target: bool,
}

impl<'a, 's> Visit<'a> for ReferenceCollector<'s> {
    fn visit_assignment_target(&mut self, target: &AssignmentTarget<'a>) {
        if !self.in_for_target && assignment_identifier(target).is_some() {
            return;
        }
        walk::walk_assignment_target(self, target);
    }

    fn visit_assignment_target_property_identifier(
        &mut self,
        prop: &AssignmentTargetPropertyIdentifier<'a>,
    ) {
        if self.in_for_target {
            self.visit_identifier_reference(&prop.binding);
        }
        if let Some(init) = &prop.init {
            self.visit_expression(init);
        }
    }

    fn visit_for_of_statement(&mut self, stmt: &ForOfStatement<'a>) {
        self.in_for_target = matches!(&stmt.left, ForStatementLeft::AssignmentTargetIdentifier(_));
        self.visit_for_statement_left(&stmt.left);
        self.in_for_target = false;
        self.visit_expression(&stmt.right);
        self.visit_statement(&stmt.body);
    }

    fn visit_for_in_statement(&mut self, stmt: &ForInStatement<'a>) {
        self.in_for_target = matches!(&stmt.left, ForStatementLeft::AssignmentTargetIdentifier(_));
        self.visit_for_statement_left(&stmt.left);
        self.in_for_target = false;
        self.visit_expression(&stmt.right);
        self.visit_statement(&stmt.body);
    }

    fn visit_identifier_reference(&mut self, it: &IdentifierReference<'a>) {
        let (symbol_id, flags) = match it.reference_id.get() {
            Some(rid) => {
                let reference = self.scoping.get_reference(rid);
                (reference.symbol_id(), reference.flags())
            }
            None => (None, ReferenceFlags::empty()),
        };
        self.refs.push(CollectedRef {
            name: it.name.to_string(),
            symbol_id,
            flags,
            is_synthesized_node: it.reference_id.get().is_none(),
        });
    }
}
