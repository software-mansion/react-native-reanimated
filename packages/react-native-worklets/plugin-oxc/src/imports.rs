use crate::ast::identifier_name;
use std::path::{Component, Path, PathBuf};

use oxc_ast::AstBuilder;

use oxc_ast::ast::{Argument, FunctionBody};
use oxc_ast_visit::{VisitMut, walk_mut::walk_function_body};
use oxc_span::SPAN;

pub fn update_relative_requires<'a>(
    body: &mut FunctionBody<'a>,
    filename: &str,
    forwardable_relative_paths: &[String],
    worklets_package_dir: Option<&str>,
    builder: AstBuilder<'a>,
) {
    if !can_forward_relative_import(filename, forwardable_relative_paths) {
        return;
    }
    let mut visitor = RelativeRequireRewriter {
        filename,
        worklets_package_dir,
        builder,
    };
    walk_function_body(&mut visitor, body);
}

struct RelativeRequireRewriter<'a, 'b> {
    filename: &'b str,
    worklets_package_dir: Option<&'b str>,
    builder: AstBuilder<'a>,
}

impl<'a, 'b> VisitMut<'a> for RelativeRequireRewriter<'a, 'b> {
    fn visit_call_expression(&mut self, call: &mut oxc_ast::ast::CallExpression<'a>) {
        oxc_ast_visit::walk_mut::walk_call_expression(self, call);

        if identifier_name(&call.callee) != Some("require") {
            return;
        }
        let Some(Argument::StringLiteral(arg)) = call.arguments.first_mut() else {
            return;
        };
        let value = arg.value.as_str();
        if !value.starts_with('.') {
            return;
        }

        let Some(rebased) = create_import_path(self.filename, value, self.worklets_package_dir)
        else {
            return;
        };
        let new_str = self.builder.str(&rebased);
        *arg = self.builder.alloc_string_literal(SPAN, new_str, None);
    }
}

pub fn create_import_path(
    filename: &str,
    original: &str,
    worklets_package_dir: Option<&str>,
) -> Option<String> {
    let filename_path = PathBuf::from(filename);
    let file_dir = filename_path.parent()?;
    let resolved = file_dir.join(original);
    let resolved = normalize_path(&resolved);

    let worklets_dir = PathBuf::from(worklets_package_dir?).join(".worklets");

    let rel = pathdiff(&worklets_dir, &resolved)?;
    let mut out = to_posix(&rel.to_string_lossy());
    if !out.starts_with('.') && !out.starts_with('/') {
        out = format!("./{out}");
    }
    Some(out)
}

pub fn can_forward_module_import(module_name: &str, forwardable: &[String]) -> bool {
    forwardable.iter().any(|forwardable_name| {
        module_name
            .strip_prefix(forwardable_name.as_str())
            .is_some_and(|rest| rest.is_empty() || rest.starts_with('/'))
    })
}

pub fn can_forward_relative_import(module_path: &str, relative_paths: &[String]) -> bool {
    if module_path.is_empty() {
        return false;
    }
    relative_paths
        .iter()
        .any(|relative_path| matches_filename_segment(module_path, relative_path))
}

fn matches_filename_segment(filename: &str, allowed_path: &str) -> bool {
    let allowed_segments: Vec<&str> = allowed_path.split('/').collect();
    let mut file_segments: Vec<&str> = filename.split('/').collect();
    if let Some(index) = file_segments.iter().rposition(|s| *s == "node_modules") {
        file_segments = file_segments.split_off(index + 1);
    }
    if allowed_segments.is_empty() {
        return false;
    }
    file_segments
        .windows(allowed_segments.len())
        .any(|window| window == allowed_segments.as_slice())
}

pub fn normalize_path(p: &Path) -> PathBuf {
    let is_absolute = p.is_absolute();
    let mut out: Vec<std::ffi::OsString> = Vec::new();
    for comp in p.components() {
        match comp {
            Component::ParentDir => {
                let can_pop = out
                    .last()
                    .map(|last| last != std::ffi::OsStr::new(".."))
                    .unwrap_or(false);
                if can_pop {
                    out.pop();
                } else if !is_absolute {
                    out.push(std::ffi::OsString::from(".."));
                }
            }
            Component::CurDir => {}
            other => out.push(other.as_os_str().to_os_string()),
        }
    }
    out.iter().collect()
}

pub fn pathdiff(from: &Path, to: &Path) -> Option<PathBuf> {
    if from.is_absolute() != to.is_absolute() {
        return None;
    }
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

pub fn to_posix(s: &str) -> String {
    s.replace('\\', "/")
}
