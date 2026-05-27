use std::env;
use std::path::{Component, Path, PathBuf};
use std::sync::OnceLock;

use oxc_allocator::TakeIn;
use oxc_ast::AstBuilder;
use oxc_ast::ast::{FunctionBody, Statement};
use oxc_span::SPAN;

const RELEASE_NEEDLES: &[&str] = &["prod", "release", "stage", "stagi"];

/// Modules whose files are always trusted to host worklets in bundle mode.
/// Matches `alwaysAllowed` in babel-plugin-worklets/src/imports.ts.
pub const ALWAYS_ALLOWED: &[&str] = &[
    "react-native-worklets",
    "react-native/Libraries/Core/setUpXHR",
];

/// Cached `BABEL_ENV`/`NODE_ENV` release check. Reading env vars on every call
/// shows up under hot transform loops, so resolve once.
pub fn is_release() -> bool {
    static CACHED: OnceLock<bool> = OnceLock::new();
    *CACHED.get_or_init(|| {
        let matches = |key: &str| match env::var(key) {
            Ok(v) => {
                let lower = v.to_ascii_lowercase();
                RELEASE_NEEDLES.iter().any(|n| lower.contains(*n))
            }
            Err(_) => false,
        };
        matches("BABEL_ENV") || matches("NODE_ENV")
    })
}

/// Whether `body` carries the directive string `name`.
pub fn body_has_directive(body: &FunctionBody<'_>, name: &str) -> bool {
    body.directives
        .iter()
        .any(|d| d.directive.as_str() == name)
}

/// Whether `body` is marked `'worklet'`.
pub fn has_worklet_directive(body: &FunctionBody<'_>) -> bool {
    body_has_directive(body, "worklet")
}

/// Prepend the `'worklet'` directive to `body` (no-op if already present).
pub fn inject_worklet_directive<'a>(body: &mut FunctionBody<'a>, builder: AstBuilder<'a>) {
    if has_worklet_directive(body) {
        return;
    }
    let dir_str = builder.str("worklet");
    let directive = builder.directive(
        SPAN,
        builder.string_literal(SPAN, dir_str, None),
        dir_str,
    );
    let mut directives = builder.vec_with_capacity(body.directives.len() + 1);
    directives.push(directive);
    for d in body.directives.drain(..) {
        directives.push(d);
    }
    body.directives = directives;
}

/// Convert an arrow expression body (single `ExpressionStatement`) into an
/// explicit `ReturnStatement` so the workletized form preserves the value.
pub fn rewrite_implicit_return<'a>(body: &mut FunctionBody<'a>, builder: AstBuilder<'a>) {
    if body.statements.len() != 1 {
        return;
    }
    let stmt = body.statements.first_mut().unwrap();
    if let Statement::ExpressionStatement(es) = stmt {
        let expr = es.expression.take_in(builder);
        *stmt = builder.statement_return(SPAN, Some(expr));
    }
}

/// Bundle-mode helper: is the current file allowed to source relative imports
/// from when reemitting them into the `.worklets/<hash>.js` bundle file?
pub fn is_allowed_for_relative_imports<'a, I>(filename: &str, workletizable: I) -> bool
where
    I: IntoIterator<Item = &'a str>,
{
    if filename.is_empty() {
        return false;
    }
    let norm = filename.replace('\\', "/");
    if ALWAYS_ALLOWED.iter().any(|m| norm.contains(m)) {
        return true;
    }
    workletizable.into_iter().any(|m| norm.contains(m))
}

/// Collapse `.` and `..` segments lexically — does NOT touch the filesystem.
pub fn normalize_path(p: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for comp in p.components() {
        match comp {
            Component::ParentDir => {
                out.pop();
            }
            Component::CurDir => {}
            other => out.push(other.as_os_str()),
        }
    }
    out
}

/// Lexical path diff: number of `..` segments to escape the common prefix +
/// the remainder. Returns `Some(".")` when the paths are equal.
pub fn pathdiff(from: &Path, to: &Path) -> Option<PathBuf> {
    let from = normalize_path(from);
    let to = normalize_path(to);

    let from_comps: Vec<_> = from.components().collect();
    let to_comps: Vec<_> = to.components().collect();

    let mut common = 0;
    while common < from_comps.len()
        && common < to_comps.len()
        && from_comps[common] == to_comps[common]
    {
        common += 1;
    }

    let mut result = PathBuf::new();
    for _ in common..from_comps.len() {
        result.push("..");
    }
    for comp in &to_comps[common..] {
        result.push(comp.as_os_str());
    }
    if result.as_os_str().is_empty() {
        Some(PathBuf::from("."))
    } else {
        Some(result)
    }
}

/// String wrapper around `pathdiff` for the `relativeSourceLocation` rewrite.
/// Falls back to `target` unchanged when `from` is empty or the paths share
/// no common root (matching Node's `path.relative` behaviour we care about).
pub fn relativize(from: &str, target: &str) -> String {
    if from.is_empty() {
        return target.to_string();
    }
    let from_path = PathBuf::from(from.replace('\\', "/"));
    let target_path = PathBuf::from(target.replace('\\', "/"));

    let from_comps: Vec<Component<'_>> = from_path.components().collect();
    let target_comps: Vec<Component<'_>> = target_path.components().collect();
    let shares_prefix = !from_comps.is_empty()
        && !target_comps.is_empty()
        && from_comps[0] == target_comps[0];
    if !shares_prefix {
        return target.to_string();
    }

    pathdiff(&from_path, &target_path)
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_else(|| target.to_string())
}
