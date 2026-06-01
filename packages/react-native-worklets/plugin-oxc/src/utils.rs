use std::env;
use std::path::{Component, Path, PathBuf};

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

/// `BABEL_ENV`/`NODE_ENV` release check. Read fresh on every call: Jest /
/// Metro flip the env between transforms inside the same Node process, so a
/// process-lifetime cache would lock the first-seen mode forever (parity
/// with TS `utils.ts:11-17`).
pub fn is_release() -> bool {
    let matches = |key: &str| match env::var(key) {
        Ok(v) => {
            let lower = v.to_ascii_lowercase();
            RELEASE_NEEDLES.iter().any(|n| lower.contains(*n))
        }
        Err(_) => false,
    };
    matches("BABEL_ENV") || matches("NODE_ENV")
}

/// Whether `body` carries the directive string `name`.
pub fn body_has_directive(body: &FunctionBody<'_>, name: &str) -> bool {
    body.directives
        .iter()
        .any(|d| d.directive.as_str() == name)
}

/// Plugin-only directives that exist to communicate intent from source to
/// this transform; they have no meaning at runtime and would survive into
/// the stringified worklet body if not stripped from every nested function /
/// arrow / class method along the way (mirrors
/// `workletFactory.ts:433-446 stripWorkletDirectives`).
const WORKLET_DIRECTIVES: &[&str] = &[
    "worklet",
    "no-worklet-closure",
    "limit-init-data-hoisting",
    "workletContext",
];

/// Recursively strip every plugin-only directive from `body` and from the
/// bodies of any nested function / arrow / object-method / class-method. The
/// outermost `worklet` directive on the function being workletized is also
/// stripped — its presence on the body would round-trip into `__initData.code`
/// and trigger the runtime to attempt a second workletization at eval time.
pub fn strip_worklet_directives_in_body<'a>(
    body: &mut FunctionBody<'a>,
    builder: AstBuilder<'a>,
) {
    use oxc_ast::ast::{
        ClassElement, Expression, ObjectPropertyKind, Statement,
    };
    // Strip directives on this body. `Directive` isn't `Clone`, so drain the
    // existing arena vec, keep the ones we want, and put them back.
    let old = std::mem::replace(&mut body.directives, builder.vec());
    let mut new_directives = builder.vec_with_capacity(old.len());
    for d in old {
        if !WORKLET_DIRECTIVES.contains(&d.directive.as_str()) {
            new_directives.push(d);
        }
    }
    body.directives = new_directives;

    for stmt in body.statements.iter_mut() {
        strip_in_statement(stmt, builder);
    }

    fn strip_in_statement<'a>(stmt: &mut Statement<'a>, builder: AstBuilder<'a>) {
        match stmt {
            Statement::FunctionDeclaration(func) => {
                if let Some(b) = func.body.as_mut() {
                    strip_worklet_directives_in_body(b, builder);
                }
            }
            Statement::BlockStatement(block) => {
                for s in block.body.iter_mut() {
                    strip_in_statement(s, builder);
                }
            }
            Statement::ClassDeclaration(class) => {
                for el in class.body.body.iter_mut() {
                    strip_in_class_element(el, builder);
                }
            }
            Statement::ExpressionStatement(es) => strip_in_expression(&mut es.expression, builder),
            Statement::VariableDeclaration(vd) => {
                for d in vd.declarations.iter_mut() {
                    if let Some(init) = &mut d.init {
                        strip_in_expression(init, builder);
                    }
                }
            }
            Statement::IfStatement(s) => {
                strip_in_statement(&mut s.consequent, builder);
                if let Some(a) = &mut s.alternate {
                    strip_in_statement(a, builder);
                }
            }
            Statement::WhileStatement(s) => strip_in_statement(&mut s.body, builder),
            Statement::DoWhileStatement(s) => strip_in_statement(&mut s.body, builder),
            Statement::ForStatement(s) => strip_in_statement(&mut s.body, builder),
            Statement::ForInStatement(s) => strip_in_statement(&mut s.body, builder),
            Statement::ForOfStatement(s) => strip_in_statement(&mut s.body, builder),
            Statement::TryStatement(s) => {
                for st in s.block.body.iter_mut() {
                    strip_in_statement(st, builder);
                }
                if let Some(h) = &mut s.handler {
                    for st in h.body.body.iter_mut() {
                        strip_in_statement(st, builder);
                    }
                }
                if let Some(f) = &mut s.finalizer {
                    for st in f.body.iter_mut() {
                        strip_in_statement(st, builder);
                    }
                }
            }
            Statement::SwitchStatement(s) => {
                for c in s.cases.iter_mut() {
                    for st in c.consequent.iter_mut() {
                        strip_in_statement(st, builder);
                    }
                }
            }
            Statement::LabeledStatement(s) => strip_in_statement(&mut s.body, builder),
            Statement::ReturnStatement(r) => {
                if let Some(arg) = &mut r.argument {
                    strip_in_expression(arg, builder);
                }
            }
            Statement::ThrowStatement(t) => strip_in_expression(&mut t.argument, builder),
            _ => {}
        }
    }

    fn strip_in_class_element<'a>(el: &mut ClassElement<'a>, builder: AstBuilder<'a>) {
        match el {
            ClassElement::MethodDefinition(m) => {
                if let Some(b) = m.value.body.as_mut() {
                    strip_worklet_directives_in_body(b, builder);
                }
            }
            ClassElement::PropertyDefinition(p) => {
                if let Some(v) = &mut p.value {
                    strip_in_expression(v, builder);
                }
            }
            ClassElement::AccessorProperty(a) => {
                if let Some(v) = &mut a.value {
                    strip_in_expression(v, builder);
                }
            }
            ClassElement::StaticBlock(b) => {
                for s in b.body.iter_mut() {
                    strip_in_statement(s, builder);
                }
            }
            _ => {}
        }
    }

    fn strip_in_expression<'a>(expr: &mut Expression<'a>, builder: AstBuilder<'a>) {
        match expr {
            Expression::FunctionExpression(func) => {
                if let Some(b) = func.body.as_mut() {
                    strip_worklet_directives_in_body(b, builder);
                }
            }
            Expression::ArrowFunctionExpression(arrow) => {
                strip_worklet_directives_in_body(&mut arrow.body, builder);
            }
            Expression::ClassExpression(class) => {
                for el in class.body.body.iter_mut() {
                    strip_in_class_element(el, builder);
                }
            }
            Expression::ObjectExpression(obj) => {
                for prop in obj.properties.iter_mut() {
                    if let ObjectPropertyKind::ObjectProperty(p) = prop {
                        strip_in_expression(&mut p.value, builder);
                    }
                }
            }
            Expression::ArrayExpression(arr) => {
                for el in arr.elements.iter_mut() {
                    if let Some(e) = el.as_expression_mut() {
                        strip_in_expression(e, builder);
                    }
                }
            }
            Expression::CallExpression(c) => {
                strip_in_expression(&mut c.callee, builder);
                for a in c.arguments.iter_mut() {
                    if let Some(e) = a.as_expression_mut() {
                        strip_in_expression(e, builder);
                    }
                }
            }
            Expression::NewExpression(n) => {
                strip_in_expression(&mut n.callee, builder);
                for a in n.arguments.iter_mut() {
                    if let Some(e) = a.as_expression_mut() {
                        strip_in_expression(e, builder);
                    }
                }
            }
            Expression::AssignmentExpression(a) => strip_in_expression(&mut a.right, builder),
            Expression::ConditionalExpression(c) => {
                strip_in_expression(&mut c.test, builder);
                strip_in_expression(&mut c.consequent, builder);
                strip_in_expression(&mut c.alternate, builder);
            }
            Expression::LogicalExpression(l) => {
                strip_in_expression(&mut l.left, builder);
                strip_in_expression(&mut l.right, builder);
            }
            Expression::BinaryExpression(b) => {
                strip_in_expression(&mut b.left, builder);
                strip_in_expression(&mut b.right, builder);
            }
            Expression::SequenceExpression(s) => {
                for e in s.expressions.iter_mut() {
                    strip_in_expression(e, builder);
                }
            }
            Expression::StaticMemberExpression(m) => strip_in_expression(&mut m.object, builder),
            Expression::ComputedMemberExpression(m) => {
                strip_in_expression(&mut m.object, builder);
                strip_in_expression(&mut m.expression, builder);
            }
            _ => {}
        }
    }
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
    let Some(stmt) = body.statements.first_mut() else {
        return;
    };
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

/// Normalise backslashes to forward slashes so emitted code stays valid on
/// Windows (Metro / `require()` accept `/` everywhere; `\` only sometimes).
pub fn to_posix(s: &str) -> String {
    s.replace('\\', "/")
}
