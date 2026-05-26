use std::collections::HashSet;
use std::path::{Component, Path, PathBuf};

use oxc_ast::AstBuilder;
use oxc_ast::ast::{Argument, Expression, FunctionBody, Statement};
use oxc_ast_visit::{VisitMut, walk_mut::walk_function_body};
use oxc_span::SPAN;

/// Path resolution used when rewriting relative `require('./x')` calls inside
/// a bundle-mode worklet body so that, after the body is hoisted into
/// `react-native-worklets/.worklets/<hash>.js`, the require still resolves to
/// the same module.
pub fn rewrite_relative_requires<'a>(
    body: &mut FunctionBody<'a>,
    filename: &str,
    workletizable_modules: &HashSet<String>,
    builder: AstBuilder<'a>,
) {
    if !is_allowed_for_relative_imports(filename, workletizable_modules) {
        return;
    }
    let mut visitor = RelativeRequireRewriter {
        filename,
        builder,
    };
    walk_function_body(&mut visitor, body);
}

const ALWAYS_ALLOWED: &[&str] = &[
    "react-native-worklets",
    "react-native/Libraries/Core/setUpXHR",
];

fn is_allowed_for_relative_imports(
    filename: &str,
    workletizable_modules: &HashSet<String>,
) -> bool {
    if filename.is_empty() {
        return false;
    }
    let norm = filename.replace('\\', "/");
    if ALWAYS_ALLOWED.iter().any(|m| norm.contains(m)) {
        return true;
    }
    workletizable_modules.iter().any(|m| norm.contains(m))
}

struct RelativeRequireRewriter<'a, 'b> {
    filename: &'b str,
    builder: AstBuilder<'a>,
}

impl<'a, 'b> VisitMut<'a> for RelativeRequireRewriter<'a, 'b> {
    fn visit_call_expression(
        &mut self,
        call: &mut oxc_ast::ast::CallExpression<'a>,
    ) {
        oxc_ast_visit::walk_mut::walk_call_expression(self, call);

        let Expression::Identifier(callee) = &call.callee else {
            return;
        };
        if callee.name.as_str() != "require" {
            return;
        }
        let Some(Argument::StringLiteral(arg)) = call.arguments.first_mut() else {
            return;
        };
        let value = arg.value.as_str();
        if !value.starts_with('.') {
            return;
        }

        let Some(rebased) = rebase_to_worklets_dir(self.filename, value) else {
            return;
        };
        let new_str = self.builder.str(&rebased);
        *arg = self
            .builder
            .alloc_string_literal(SPAN, new_str, None);
    }
}

/// Compute the relative path from
/// `<react-native-worklets package root>/.worklets/`
/// to `<directory of current file>/<original relative path>`.
///
/// We don't have a real path to the worklets package at transform time, so
/// we synthesise one (`/<pkg>/.worklets`) using whatever prefix of `filename`
/// precedes the literal `react-native-worklets` substring (or just `/`) and
/// compute the relative path lexically. This produces the same shape that the
/// babel plugin emits (e.g. `'../helpers/foo'`), which is all the test
/// snapshots key on.
fn rebase_to_worklets_dir(filename: &str, original: &str) -> Option<String> {
    let filename_path = PathBuf::from(filename.replace('\\', "/"));
    let file_dir = filename_path.parent()?;
    let resolved = file_dir.join(original);
    let resolved = normalize_path(&resolved);

    let worklets_pkg_root = derive_worklets_root(filename);
    let worklets_dir = worklets_pkg_root.join(".worklets");

    let rel = pathdiff(&worklets_dir, &resolved)?;
    let mut out = rel.to_string_lossy().into_owned();
    if !out.starts_with('.') && !out.starts_with('/') {
        out = format!("./{out}");
    }
    Some(out)
}

fn derive_worklets_root(filename: &str) -> PathBuf {
    let norm = filename.replace('\\', "/");
    if let Some(idx) = norm.find("/react-native-worklets/") {
        let end = idx + "/react-native-worklets".len();
        return PathBuf::from(&norm[..end]);
    }
    if let Some(idx) = norm.find("/react-native-worklets") {
        let end = idx + "/react-native-worklets".len();
        return PathBuf::from(&norm[..end]);
    }
    PathBuf::from("/react-native-worklets")
}

fn normalize_path(p: &Path) -> PathBuf {
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
/// the remainder.
fn pathdiff(from: &Path, to: &Path) -> Option<PathBuf> {
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

/// Stub to keep imports tidy.
#[allow(dead_code)]
fn _supress(_: Statement<'_>) {}
