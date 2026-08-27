use std::env;
use std::path::{Component, Path, PathBuf};

use oxc_allocator::TakeIn;
use oxc_ast::ast::{
    AssignmentTarget, CallExpression, Expression, FunctionBody, IdentifierReference,
    ObjectExpression, Statement, VariableDeclarationKind,
};
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_span::SPAN;

const RELEASE_NEEDLES: &[&str] = &["prod", "release", "stage", "stagi"];

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

fn looks_like_release(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    RELEASE_NEEDLES.iter().any(|n| lower.contains(*n))
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

const WORKLET_DIRECTIVES: &[&str] = &["worklet", "no-worklet-closure", "limit-init-data-hoisting"];

const NO_MEMO_DIRECTIVE: &str = "use no memo";

pub fn strip_worklet_directives<'a>(
    body: &mut FunctionBody<'a>,
    builder: AstBuilder<'a>,
    keep_no_memo: bool,
) {
    let was_worklet = body
        .directives
        .iter()
        .any(|d| d.directive.as_str() == "worklet");
    let has_no_memo = body
        .directives
        .iter()
        .any(|d| d.directive.as_str() == NO_MEMO_DIRECTIVE);
    if keep_no_memo {
        body.directives
            .retain(|d| !WORKLET_DIRECTIVES.contains(&d.directive.as_str()));
    } else {
        body.directives.clear();
    }
    if keep_no_memo && was_worklet && !has_no_memo {
        body.directives
            .push(build_directive(builder, NO_MEMO_DIRECTIVE));
    }
}

pub fn const_decl<'a>(
    builder: AstBuilder<'a>,
    pattern: oxc_ast::ast::BindingPattern<'a>,
    init: Expression<'a>,
) -> Statement<'a> {
    Statement::VariableDeclaration(const_declaration(builder, pattern, init))
}

pub fn const_declaration<'a>(
    builder: AstBuilder<'a>,
    pattern: oxc_ast::ast::BindingPattern<'a>,
    init: Expression<'a>,
) -> oxc_allocator::Box<'a, oxc_ast::ast::VariableDeclaration<'a>> {
    let declarator = builder.variable_declarator(
        SPAN,
        VariableDeclarationKind::Const,
        pattern,
        NONE,
        Some(init),
        false,
    );
    let declarations = builder.vec1(declarator);
    builder.alloc_variable_declaration(SPAN, VariableDeclarationKind::Const, declarations, false)
}

pub fn add_worklet_directives_to_function_body<'a>(
    body: &mut FunctionBody<'a>,
    builder: AstBuilder<'a>,
) {
    if has_worklet_directive(body) {
        return;
    }
    body.directives
        .insert(0, build_directive(builder, "worklet"));
}

fn build_directive<'a>(builder: AstBuilder<'a>, value: &str) -> oxc_ast::ast::Directive<'a> {
    let dir_str = builder.str(value);
    builder.directive(SPAN, builder.string_literal(SPAN, dir_str, None), dir_str)
}

pub fn closure_binding_pattern<'a>(
    builder: AstBuilder<'a>,
    closure_variables: &[String],
) -> oxc_ast::ast::BindingPattern<'a> {
    let mut properties = builder.vec_with_capacity(closure_variables.len());
    for name in closure_variables {
        let ident = builder.ident(name);
        properties.push(builder.binding_property(
            SPAN,
            oxc_ast::ast::PropertyKey::StaticIdentifier(builder.alloc_identifier_name(SPAN, ident)),
            builder.binding_pattern_binding_identifier(SPAN, ident),
            true,
            false,
        ));
    }
    builder.binding_pattern_object_pattern(SPAN, properties, NONE)
}

pub fn is_object_method(prop: &oxc_ast::ast::ObjectProperty<'_>) -> bool {
    prop.method || prop.kind.is_accessor()
}

pub fn has_worklet_directive(body: &FunctionBody<'_>) -> bool {
    body.directives
        .iter()
        .any(|d| d.directive.as_str() == "worklet")
}

pub fn replace_implicit_return_with_block<'a>(
    body: &mut FunctionBody<'a>,
    builder: AstBuilder<'a>,
) {
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

pub fn identifier_name<'a>(expr: &Expression<'a>) -> Option<&'a str> {
    match expr {
        Expression::Identifier(id) => Some(id.name.as_str()),
        _ => None,
    }
}

pub fn call_expression<'e, 'a>(expr: &'e Expression<'a>) -> Option<&'e CallExpression<'a>> {
    match expr {
        Expression::CallExpression(call) => Some(call),
        _ => None,
    }
}

pub fn object_expression<'e, 'a>(expr: &'e Expression<'a>) -> Option<&'e ObjectExpression<'a>> {
    match expr {
        Expression::ObjectExpression(object) => Some(object),
        _ => None,
    }
}

pub fn member_property<'e, 'a>(expr: &'e Expression<'a>) -> Option<(&'e Expression<'a>, &'a str)> {
    match expr {
        Expression::StaticMemberExpression(member) => {
            Some((&member.object, member.property.name.as_str()))
        }
        Expression::ComputedMemberExpression(member) => {
            identifier_name(&member.expression).map(|name| (&member.object, name))
        }
        _ => None,
    }
}

pub fn member_object<'e, 'a>(expr: &'e Expression<'a>) -> Option<&'e Expression<'a>> {
    expr.as_member_expression().map(|member| member.object())
}

pub fn assignment_identifier<'e, 'a>(
    target: &'e AssignmentTarget<'a>,
) -> Option<&'e IdentifierReference<'a>> {
    match target {
        AssignmentTarget::AssignmentTargetIdentifier(id) => Some(id),
        _ => None,
    }
}
