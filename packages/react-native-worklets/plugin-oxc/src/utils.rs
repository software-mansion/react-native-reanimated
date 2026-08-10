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
    use oxc_ast::ast::{
        ClassElement, Expression, ObjectPropertyKind, Statement,
    };
    let old = std::mem::replace(&mut body.directives, builder.vec());
    let was_worklet = old
        .iter()
        .any(|d| d.directive.as_str() == "worklet");
    let mut new_directives = builder.vec_with_capacity(old.len() + 1);
    if keep_no_memo && was_worklet {
        new_directives.push(build_directive(builder, NO_MEMO_DIRECTIVE));
    }
    for d in old {
        if WORKLET_DIRECTIVES.contains(&d.directive.as_str()) {
            continue;
        }
        if !keep_no_memo {
            continue;
        }
        if d.directive.as_str() == NO_MEMO_DIRECTIVE {
            continue;
        }
        new_directives.push(d);
    }
    body.directives = new_directives;

    for stmt in body.statements.iter_mut() {
        strip_in_statement(stmt, builder, keep_no_memo);
    }

    fn strip_in_statement<'a>(stmt: &mut Statement<'a>, builder: AstBuilder<'a>, keep_no_memo: bool) {
        match stmt {
            Statement::FunctionDeclaration(func) => {
                if let Some(b) = func.body.as_mut() {
                    strip_worklet_directives_in_body(b, builder, keep_no_memo);
                }
            }
            Statement::BlockStatement(block) => {
                for s in block.body.iter_mut() {
                    strip_in_statement(s, builder, keep_no_memo);
                }
            }
            Statement::ClassDeclaration(class) => {
                for el in class.body.body.iter_mut() {
                    strip_in_class_element(el, builder, keep_no_memo);
                }
            }
            Statement::ExpressionStatement(es) => strip_in_expression(&mut es.expression, builder, keep_no_memo),
            Statement::VariableDeclaration(vd) => {
                for d in vd.declarations.iter_mut() {
                    if let Some(init) = &mut d.init {
                        strip_in_expression(init, builder, keep_no_memo);
                    }
                }
            }
            Statement::IfStatement(s) => {
                strip_in_statement(&mut s.consequent, builder, keep_no_memo);
                if let Some(a) = &mut s.alternate {
                    strip_in_statement(a, builder, keep_no_memo);
                }
            }
            Statement::WhileStatement(s) => strip_in_statement(&mut s.body, builder, keep_no_memo),
            Statement::DoWhileStatement(s) => strip_in_statement(&mut s.body, builder, keep_no_memo),
            Statement::ForStatement(s) => strip_in_statement(&mut s.body, builder, keep_no_memo),
            Statement::ForInStatement(s) => strip_in_statement(&mut s.body, builder, keep_no_memo),
            Statement::ForOfStatement(s) => strip_in_statement(&mut s.body, builder, keep_no_memo),
            Statement::TryStatement(s) => {
                for st in s.block.body.iter_mut() {
                    strip_in_statement(st, builder, keep_no_memo);
                }
                if let Some(h) = &mut s.handler {
                    for st in h.body.body.iter_mut() {
                        strip_in_statement(st, builder, keep_no_memo);
                    }
                }
                if let Some(f) = &mut s.finalizer {
                    for st in f.body.iter_mut() {
                        strip_in_statement(st, builder, keep_no_memo);
                    }
                }
            }
            Statement::SwitchStatement(s) => {
                for c in s.cases.iter_mut() {
                    for st in c.consequent.iter_mut() {
                        strip_in_statement(st, builder, keep_no_memo);
                    }
                }
            }
            Statement::LabeledStatement(s) => strip_in_statement(&mut s.body, builder, keep_no_memo),
            Statement::ReturnStatement(r) => {
                if let Some(arg) = &mut r.argument {
                    strip_in_expression(arg, builder, keep_no_memo);
                }
            }
            Statement::ThrowStatement(t) => strip_in_expression(&mut t.argument, builder, keep_no_memo),
            _ => {}
        }
    }

    fn strip_in_class_element<'a>(el: &mut ClassElement<'a>, builder: AstBuilder<'a>, keep_no_memo: bool) {
        match el {
            ClassElement::MethodDefinition(m) => {
                if let Some(b) = m.value.body.as_mut() {
                    strip_worklet_directives_in_body(b, builder, keep_no_memo);
                }
            }
            ClassElement::PropertyDefinition(p) => {
                if let Some(v) = &mut p.value {
                    strip_in_expression(v, builder, keep_no_memo);
                }
            }
            ClassElement::AccessorProperty(a) => {
                if let Some(v) = &mut a.value {
                    strip_in_expression(v, builder, keep_no_memo);
                }
            }
            ClassElement::StaticBlock(b) => {
                for s in b.body.iter_mut() {
                    strip_in_statement(s, builder, keep_no_memo);
                }
            }
            _ => {}
        }
    }

    fn strip_in_expression<'a>(expr: &mut Expression<'a>, builder: AstBuilder<'a>, keep_no_memo: bool) {
        match expr {
            Expression::FunctionExpression(func) => {
                if let Some(b) = func.body.as_mut() {
                    strip_worklet_directives_in_body(b, builder, keep_no_memo);
                }
            }
            Expression::ArrowFunctionExpression(arrow) => {
                strip_worklet_directives_in_body(&mut arrow.body, builder, keep_no_memo);
            }
            Expression::ClassExpression(class) => {
                for el in class.body.body.iter_mut() {
                    strip_in_class_element(el, builder, keep_no_memo);
                }
            }
            Expression::ObjectExpression(obj) => {
                for prop in obj.properties.iter_mut() {
                    if let ObjectPropertyKind::ObjectProperty(p) = prop {
                        strip_in_expression(&mut p.value, builder, keep_no_memo);
                    }
                }
            }
            Expression::ArrayExpression(arr) => {
                for el in arr.elements.iter_mut() {
                    if let Some(e) = el.as_expression_mut() {
                        strip_in_expression(e, builder, keep_no_memo);
                    }
                }
            }
            Expression::CallExpression(c) => {
                strip_in_expression(&mut c.callee, builder, keep_no_memo);
                for a in c.arguments.iter_mut() {
                    if let Some(e) = a.as_expression_mut() {
                        strip_in_expression(e, builder, keep_no_memo);
                    }
                }
            }
            Expression::NewExpression(n) => {
                strip_in_expression(&mut n.callee, builder, keep_no_memo);
                for a in n.arguments.iter_mut() {
                    if let Some(e) = a.as_expression_mut() {
                        strip_in_expression(e, builder, keep_no_memo);
                    }
                }
            }
            Expression::AssignmentExpression(a) => strip_in_expression(&mut a.right, builder, keep_no_memo),
            Expression::ConditionalExpression(c) => {
                strip_in_expression(&mut c.test, builder, keep_no_memo);
                strip_in_expression(&mut c.consequent, builder, keep_no_memo);
                strip_in_expression(&mut c.alternate, builder, keep_no_memo);
            }
            Expression::LogicalExpression(l) => {
                strip_in_expression(&mut l.left, builder, keep_no_memo);
                strip_in_expression(&mut l.right, builder, keep_no_memo);
            }
            Expression::BinaryExpression(b) => {
                strip_in_expression(&mut b.left, builder, keep_no_memo);
                strip_in_expression(&mut b.right, builder, keep_no_memo);
            }
            Expression::SequenceExpression(s) => {
                for e in s.expressions.iter_mut() {
                    strip_in_expression(e, builder, keep_no_memo);
                }
            }
            Expression::StaticMemberExpression(m) => strip_in_expression(&mut m.object, builder, keep_no_memo),
            Expression::ComputedMemberExpression(m) => {
                strip_in_expression(&mut m.object, builder, keep_no_memo);
                strip_in_expression(&mut m.expression, builder, keep_no_memo);
            }
            _ => {}
        }
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

pub fn to_posix(s: &str) -> String {
    s.replace('\\', "/")
}
