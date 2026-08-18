use std::path::PathBuf;

use oxc_ast::AstBuilder;

use oxc_ast::ast::{Argument, FunctionBody};
use oxc_ast_visit::{walk_mut::walk_function_body, VisitMut};
use oxc_span::SPAN;

use crate::utils::{identifier_name, normalize_path, pathdiff};

pub fn rewrite_relative_requires<'a>(
    body: &mut FunctionBody<'a>,
    filename: &str,
    forwardable_relative_paths: &[String],
    worklets_package_dir: Option<&str>,
    builder: AstBuilder<'a>,
) {
    if !crate::utils::can_forward_relative_import(filename, forwardable_relative_paths) {
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

        let Some(rebased) =
            rebase_to_worklets_dir_with(self.filename, value, self.worklets_package_dir)
        else {
            return;
        };
        let new_str = self.builder.str(&rebased);
        *arg = self.builder.alloc_string_literal(SPAN, new_str, None);
    }
}

pub fn rebase_to_worklets_dir_with(
    filename: &str,
    original: &str,
    worklets_package_dir: Option<&str>,
) -> Option<String> {
    let filename_path = PathBuf::from(filename);
    let file_dir = filename_path.parent()?;
    let resolved = file_dir.join(original);
    let resolved = normalize_path(&resolved);

    let worklets_pkg_root = worklets_package_dir
        .map(PathBuf::from)
        .unwrap_or_else(|| derive_worklets_root(filename));
    let worklets_dir = worklets_pkg_root.join(".worklets");

    let rel = pathdiff(&worklets_dir, &resolved)?;
    let mut out = crate::utils::to_posix(&rel.to_string_lossy());
    if !out.starts_with('.') && !out.starts_with('/') {
        out = format!("./{out}");
    }
    Some(out)
}

fn derive_worklets_root(filename: &str) -> PathBuf {
    const SEGMENT: &str = "/react-native-worklets";
    let mut from = 0;
    while let Some(idx) = filename[from..].find(SEGMENT) {
        let end = from + idx + SEGMENT.len();
        match filename[end..].chars().next() {
            None | Some('/') => return PathBuf::from(&filename[..end]),
            _ => from = end,
        }
    }
    PathBuf::from(SEGMENT)
}
