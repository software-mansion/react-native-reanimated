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

#[derive(Debug, Default)]
pub struct ClosureResult {
    /// Names captured by the worklet's closure, in order of first reference.
    pub closure_variables: Vec<String>,
    /// Imports the worklet body depends on. In bundle mode each is re-emitted
    /// as an `import` declaration at the top of the `.worklets/<hash>.js` file
    /// so the worklet body's references resolve at module load time on the
    /// worklet runtime side.
    pub imports: Vec<ImportInfo>,
}

/// Walk the function body, identify references that must be captured in the
/// worklet's closure, and bucketize the rest.
///
/// `function_scope_id` is the scope created by the function. Bindings owned by
/// this scope or any descendant are local and skipped.
///
/// `force_capture` is a set of names that must always be captured (even
/// under `strictGlobal`). Used to honour identifier names that the worklet
/// pass synthesized into the body — e.g. closure-var parameters of an inner
/// factory call — which have no `reference_id` for `oxc_semantic` to resolve.
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
                if state.opts.bundle_mode.unwrap_or(false) && flags.is_import() {
                    if let Some(info) = state.imports_by_symbol.get(&symbol_id) {
                        // Skip namespace imports — TS `isImport` only accepts
                        // ImportSpecifier / ImportDefaultSpecifier (imports.ts:46-48).
                        // `import * as foo` falls through to plain closure capture.
                        if matches!(info.shape, ImportShape::Namespace) {
                            seen.insert(r.name.clone());
                            result.closure_variables.push(r.name);
                            continue;
                        }
                        // Re-emit as an `import` in the bundle file ONLY when:
                        //   - relative + the current file lives inside a
                        //     workletizable module (so `..` paths resolve),
                        //   - or the import source itself is a workletizable
                        //     module (library import).
                        // Otherwise fall through to closure capture, matching
                        // babel-plugin-worklets/src/closure.ts.
                        let source = &info.source;
                        let is_rel = source.starts_with('.');
                        let allowed_for_rel = is_rel
                            && is_allowed_for_relative_imports(
                                filename,
                                state.opts.workletizable_modules.as_deref(),
                            );
                        let lib_workletizable = !is_rel
                            && is_workletizable_module(
                                source,
                                state.opts.workletizable_modules.as_deref(),
                            );
                        if allowed_for_rel || lib_workletizable {
                            result.imports.push(info.clone());
                            seen.insert(r.name);
                            continue;
                        }
                        // Else: fall through to closure capture below.
                    }
                }

                seen.insert(r.name.clone());
                result.closure_variables.push(r.name);
            }
            None => {
                // Synthesized identifier — has no SymbolId because it was
                // minted by the worklet pass *after* semantic analysis.
                // These include `_worklet_<hash>_init_data` and the closure
                // vars injected into inner factory calls. Capture them so
                // the body can dereference them on the UI thread, unless
                // they shadow a binding local to this function.
                let is_synthesized = is_synthesized_init_data(&r.name)
                    || force_capture.contains(&r.name);
                if is_synthesized {
                    // Re-resolve by name against the original scoping. If the
                    // name binds to a symbol inside our function's scope
                    // (e.g. one of our own params), it's local and must NOT
                    // be captured — capturing it would over-include the
                    // function's args in __closure.
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

/// Modules whose files are always trusted to host worklets in bundle mode.
/// Matches `alwaysAllowed` in babel-plugin-worklets/src/imports.ts.
const ALWAYS_ALLOWED: &[&str] = &[
    "react-native-worklets",
    "react-native/Libraries/Core/setUpXHR",
];

fn is_allowed_for_relative_imports(filename: &str, workletizable: Option<&[String]>) -> bool {
    if filename.is_empty() {
        return false;
    }
    let norm = filename.replace('\\', "/");
    if ALWAYS_ALLOWED.iter().any(|m| norm.contains(m)) {
        return true;
    }
    workletizable
        .map(|ms| ms.iter().any(|m| norm.contains(m)))
        .unwrap_or(false)
}

fn is_workletizable_module(source: &str, workletizable: Option<&[String]>) -> bool {
    if ALWAYS_ALLOWED.iter().any(|m| source.starts_with(m)) {
        return true;
    }
    workletizable
        .map(|ms| ms.iter().any(|m| source.starts_with(m)))
        .unwrap_or(false)
}

/// `_worklet_<digits>_init_data` — names minted by `worklet_factory.rs` when
/// hoisting init-data declarations to top-level. Such references appear inside
/// outer-worklet bodies after we inline an inner worklet's factory call.
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
