use std::env;
use std::path::{Component, Path, PathBuf};

use oxc_allocator::TakeIn;
use oxc_ast::AstBuilder;
use oxc_ast::ast::{FunctionBody, Statement};
use oxc_span::SPAN;

const RELEASE_NEEDLES: &[&str] = &["prod", "release", "stage", "stagi"];

fn looks_like_release(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    RELEASE_NEEDLES.iter().any(|n| lower.contains(*n))
}

pub fn is_release(env_name: Option<&str>) -> bool {
    if let Some(env_name) = env_name {
        if looks_like_release(env_name) {
            return true;
        }
        if env_name.to_ascii_lowercase().contains("dev") {
            return false;
        }
    }
    let matches = |key: &str| match env::var(key) {
        Ok(v) => looks_like_release(&v),
        Err(_) => false,
    };
    matches("BABEL_ENV") || matches("NODE_ENV")
}

pub fn can_forward_module_import(module_name: &str, forwardable: &[String]) -> bool {
    forwardable.iter().any(|forwardable_name| {
        module_name == forwardable_name
            || module_name.starts_with(&format!("{forwardable_name}/"))
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
    if allowed_segments.len() > file_segments.len() {
        return false;
    }
    (0..=file_segments.len() - allowed_segments.len()).any(|start| {
        allowed_segments
            .iter()
            .enumerate()
            .all(|(offset, segment)| file_segments[start + offset] == *segment)
    })
}

pub fn body_has_directive(body: &FunctionBody<'_>, name: &str) -> bool {
    body.directives
        .iter()
        .any(|d| d.directive.as_str() == name)
}

const WORKLET_DIRECTIVES: &[&str] = &[
    "worklet",
    "no-worklet-closure",
    "limit-init-data-hoisting",
    "workletContext",
];

const NO_MEMO_DIRECTIVE: &str = "use no memo";

fn build_directive<'a>(
    builder: AstBuilder<'a>,
    value: &str,
) -> oxc_ast::ast::Directive<'a> {
    let dir_str = builder.str(value);
    builder.directive(SPAN, builder.string_literal(SPAN, dir_str, None), dir_str)
}

pub fn strip_worklet_directives_in_body<'a>(
    body: &mut FunctionBody<'a>,
    builder: AstBuilder<'a>,
    keep_no_memo: bool,
) {
    use oxc_ast_visit::VisitMut;

    strip_directives(body, builder, keep_no_memo);
    let mut stripper = DirectiveStripper {
        builder,
        keep_no_memo,
    };
    for stmt in body.statements.iter_mut() {
        stripper.visit_statement(stmt);
    }
}

fn strip_directives<'a>(
    body: &mut FunctionBody<'a>,
    builder: AstBuilder<'a>,
    keep_no_memo: bool,
) {
    let old = std::mem::replace(&mut body.directives, builder.vec());
    let was_worklet = old.iter().any(|d| d.directive.as_str() == "worklet");
    let mut new_directives = builder.vec_with_capacity(old.len() + 1);
    if keep_no_memo && was_worklet {
        new_directives.push(build_directive(builder, NO_MEMO_DIRECTIVE));
    }
    for d in old {
        if WORKLET_DIRECTIVES.contains(&d.directive.as_str()) {
            continue;
        }
        if !keep_no_memo || d.directive.as_str() == NO_MEMO_DIRECTIVE {
            continue;
        }
        new_directives.push(d);
    }
    body.directives = new_directives;
}

/// Walks every nested function so a plugin-only directive can't survive in a
/// position the previous hand-rolled `match` didn't enumerate (`await`,
/// `yield`, tagged templates, spreads, …).
struct DirectiveStripper<'a> {
    builder: AstBuilder<'a>,
    keep_no_memo: bool,
}

impl<'a> oxc_ast_visit::VisitMut<'a> for DirectiveStripper<'a> {
    fn visit_function_body(&mut self, body: &mut FunctionBody<'a>) {
        strip_directives(body, self.builder, self.keep_no_memo);
        oxc_ast_visit::walk_mut::walk_function_body(self, body);
    }
}

pub fn has_worklet_directive(body: &FunctionBody<'_>) -> bool {
    body_has_directive(body, "worklet")
}

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

pub fn rewrite_implicit_return<'a>(body: &mut FunctionBody<'a>, builder: AstBuilder<'a>) {
    if body.statements.len() != 1 {
        return;
    }
    let Some(stmt) = body.statements.first_mut() else {
        return;
    };
    if let Statement::ExpressionStatement(es) = stmt {
        let expr = es.expression.take_in(builder);
        *stmt = builder.statement_return(SPAN, Some(expr));
    }
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
                    // A relative path may legitimately escape its own root.
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
    // Walking between an absolute and a relative path can't produce a
    // meaningful result — the relative one has no known anchor.
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
