use std::collections::HashSet;

use oxc_ast::ast::{ArrowFunctionExpression, Function, IdentifierReference};
use oxc_ast_visit::Visit;
use oxc_semantic::Scoping;
use oxc_syntax::reference::ReferenceFlags;
use oxc_syntax::scope::ScopeId;
use oxc_syntax::symbol::SymbolId;

use crate::state::State;

#[derive(Debug, Default)]
pub struct ClosureResult {
    /// Names captured by the worklet's closure, in order of first reference.
    pub closure_variables: Vec<String>,
    /// SymbolIds resolving to imports from workletizable library modules.
    /// Bundle-mode only.
    pub library_bindings: HashSet<SymbolId>,
    /// SymbolIds resolving to relative imports inside a worklet-allowed file.
    /// Bundle-mode only.
    pub relative_bindings: HashSet<SymbolId>,
}

/// Walk the function body, identify references that must be captured in the
/// worklet's closure, and bucketize the rest.
///
/// `function_scope_id` is the scope created by the function. Bindings owned by
/// this scope or any descendant are local and skipped.
pub fn closure_for_function<'a, B: WalkFunctionBody<'a>>(
    body: B,
    function_scope_id: ScopeId,
    self_function_name: Option<&str>,
    scoping: &Scoping,
    state: &State,
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
                if state.opts.bundle_mode.unwrap_or(false) && flags.is_import() {
                    // TODO: classify import source (relative vs library) by walking
                    // up to the parent ImportDeclaration. Until then, treat all as library.
                    result.library_bindings.insert(symbol_id);
                    seen.insert(r.name);
                    continue;
                }

                seen.insert(r.name.clone());
                result.closure_variables.push(r.name);
            }
            None => {
                if state.opts.strict_global.unwrap_or(false) {
                    continue;
                }
                if state.globals.contains(&r.name) {
                    continue;
                }
                seen.insert(r.name.clone());
                result.closure_variables.push(r.name);
            }
        }
    }

    result
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

/// Drives visitor walks over a function's body + params, regardless of whether
/// the function is a `Function` or `ArrowFunctionExpression`.
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
