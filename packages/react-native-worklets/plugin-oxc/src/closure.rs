use std::collections::HashSet;

use oxc_ast::ast::{ArrowFunctionExpression, Function, IdentifierReference};
use oxc_ast_visit::Visit;
use oxc_semantic::Scoping;
use oxc_syntax::reference::ReferenceFlags;
use oxc_syntax::scope::ScopeId;
use oxc_syntax::symbol::SymbolId;
#[allow(unused_imports)]
use oxc_syntax::scope::ScopeFlags;

use crate::state::{ImportInfo, ImportShape, State};
use crate::utils::{can_forward_module_import, can_forward_relative_import};

#[derive(Debug, Default)]
pub struct ClosureResult {
    pub closure_variables: Vec<String>,
    pub imports: Vec<ImportInfo>,
}

pub fn closure_for_function<'a, B: WalkFunctionBody<'a>>(
    body: B,
    function_scope_id: ScopeId,
    self_function_name: Option<&str>,
    scoping: &Scoping,
    state: &State,
    force_capture: &HashSet<String>,
    filename: &str,
) -> ClosureResult {
    let mut collector = ReferenceCollector {
        scoping,
        refs: Vec::new(),
    };
    body.walk_into(&mut collector);

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
                if let Some(fn_name) = self_function_name {
                    if fn_name == r.name && scoping.symbol_name(symbol_id) == fn_name {
                        continue;
                    }
                }

                let flags = scoping.symbol_flags(symbol_id);
                if flags.is_import() {
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
                            && can_forward_module_import(
                                source,
                                &state.forwardable_module_names,
                            );
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
                let is_synthesized = is_synthesized_init_data(&r.name)
                    || force_capture.contains(&r.name);
                if is_synthesized {
                    if let Some(sym) = scoping
                        .find_binding(function_scope_id, r.name.as_str().into())
                    {
                        let sym_scope = scoping.symbol_scope_id(sym);
                        if scope_is_inside(scoping, sym_scope, function_scope_id) {
                            continue;
                        }
                    }
                    seen.insert(r.name.clone());
                    result.closure_variables.push(r.name);
                    continue;
                }
                continue;
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

fn scope_is_inside(scoping: &Scoping, inner: ScopeId, outer: ScopeId) -> bool {
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
}

struct ReferenceCollector<'s> {
    scoping: &'s Scoping,
    refs: Vec<CollectedRef>,
}

impl<'a, 's> Visit<'a> for ReferenceCollector<'s> {
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
        });
    }
}

pub trait WalkFunctionBody<'a> {
    fn walk_into<V: Visit<'a>>(self, visitor: &mut V);
}

impl<'a, 'b> WalkFunctionBody<'a> for &'b Function<'a> {
    fn walk_into<V: Visit<'a>>(self, visitor: &mut V) {
        if let Some(body) = &self.body {
            visitor.visit_function_body(body);
        }
        visitor.visit_formal_parameters(&self.params);
    }
}

impl<'a, 'b> WalkFunctionBody<'a> for &'b ArrowFunctionExpression<'a> {
    fn walk_into<V: Visit<'a>>(self, visitor: &mut V) {
        visitor.visit_function_body(&self.body);
        visitor.visit_formal_parameters(&self.params);
    }
}
