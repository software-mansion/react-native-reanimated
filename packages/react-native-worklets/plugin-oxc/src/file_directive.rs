use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    Declaration, Expression, FunctionBody, ObjectExpression, ObjectPropertyKind, Program,
    PropertyKey, Statement, VariableDeclarator,
};
use oxc_span::SPAN;

use crate::context_object::CONTEXT_OBJECT_MARKER;

/// Implements `processIfWorkletFile` from file.ts: when the Program has a
/// top-level `'worklet'` directive, treat every viable top-level entity as a
/// worklet by injecting `'worklet'` into its body.
///
/// Returns `true` if a file directive was present and removed.
pub fn process_file_directive<'a>(program: &mut Program<'a>, builder: AstBuilder<'a>) -> bool {
    let has_directive = program
        .directives
        .iter()
        .any(|d| d.directive.as_str() == "worklet");
    if !has_directive {
        return false;
    }

    // Strip the file directive.
    let kept = program
        .directives
        .drain(..)
        .filter(|d| d.directive.as_str() != "worklet")
        .collect::<Vec<_>>();
    let mut new_dirs = builder.vec_with_capacity(kept.len());
    for d in kept {
        new_dirs.push(d);
    }
    program.directives = new_dirs;

    // Inject 'worklet' into every viable top-level entity.
    dehoist_commonjs_exports(program, builder);
    for stmt in program.body.iter_mut() {
        process_top_level(stmt, builder);
    }
    true
}

fn process_top_level<'a>(stmt: &mut Statement<'a>, builder: AstBuilder<'a>) {
    let candidate = match stmt {
        Statement::ExportNamedDeclaration(decl) => {
            if let Some(decl) = &mut decl.declaration {
                inject_into_declaration(decl, builder);
            }
            return;
        }
        Statement::ExportDefaultDeclaration(_decl) => return,
        s => s,
    };
    inject_into_statement(candidate, builder);
}

fn inject_into_statement<'a>(stmt: &mut Statement<'a>, builder: AstBuilder<'a>) {
    match stmt {
        Statement::FunctionDeclaration(func) => {
            if let Some(body) = func.body.as_mut() {
                inject_worklet_directive(body, builder);
            }
        }
        Statement::VariableDeclaration(vd) => {
            for decl in vd.declarations.iter_mut() {
                inject_into_variable_declarator(decl, builder);
            }
        }
        Statement::ClassDeclaration(class) => {
            inject_class_marker(&mut class.body, builder);
        }
        _ => {}
    }
}

fn inject_class_marker<'a>(
    body: &mut oxc_ast::ast::ClassBody<'a>,
    builder: AstBuilder<'a>,
) {
    use oxc_ast::ast::{ClassElement, PropertyKey};
    let already = body.body.iter().any(|el| {
        if let ClassElement::PropertyDefinition(prop) = el {
            if let PropertyKey::StaticIdentifier(id) = &prop.key {
                return id.name.as_str() == "__workletClass";
            }
        }
        false
    });
    if already {
        return;
    }
    let marker_value = builder.expression_boolean_literal(SPAN, true);
    let key = PropertyKey::StaticIdentifier(
        builder.alloc_identifier_name(SPAN, "__workletClass"),
    );
    let prop = builder.class_element_property_definition(
        SPAN,
        oxc_ast::ast::PropertyDefinitionType::PropertyDefinition,
        builder.vec(),
        key,
        NONE,
        Some(marker_value),
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        None,
    );
    body.body.push(prop);
}

fn inject_into_declaration<'a>(decl: &mut Declaration<'a>, builder: AstBuilder<'a>) {
    match decl {
        Declaration::FunctionDeclaration(func) => {
            if let Some(body) = func.body.as_mut() {
                inject_worklet_directive(body, builder);
            }
        }
        Declaration::VariableDeclaration(vd) => {
            for d in vd.declarations.iter_mut() {
                inject_into_variable_declarator(d, builder);
            }
        }
        Declaration::ClassDeclaration(class) => {
            inject_class_marker(&mut class.body, builder);
        }
        _ => {}
    }
}

fn inject_into_variable_declarator<'a>(
    declarator: &mut VariableDeclarator<'a>,
    builder: AstBuilder<'a>,
) {
    let Some(init) = &mut declarator.init else {
        return;
    };
    inject_into_expression(init, builder);
}

fn inject_into_expression<'a>(expr: &mut Expression<'a>, builder: AstBuilder<'a>) {
    match expr {
        Expression::ArrowFunctionExpression(arrow) => {
            inject_worklet_directive(&mut arrow.body, builder);
        }
        Expression::FunctionExpression(func) => {
            if let Some(body) = func.body.as_mut() {
                inject_worklet_directive(body, builder);
            }
        }
        Expression::ObjectExpression(obj) => {
            inject_into_object_expression(obj, builder);
        }
        _ => {}
    }
}

fn inject_into_object_expression<'a>(obj: &mut ObjectExpression<'a>, builder: AstBuilder<'a>) {
    for prop in obj.properties.iter_mut() {
        if let ObjectPropertyKind::ObjectProperty(prop) = prop {
            if prop.method {
                if let Expression::FunctionExpression(func) = &mut prop.value {
                    if let Some(body) = func.body.as_mut() {
                        inject_worklet_directive(body, builder);
                    }
                }
            } else {
                inject_into_expression(&mut prop.value, builder);
            }
        }
    }
}

fn inject_worklet_directive<'a>(body: &mut FunctionBody<'a>, builder: AstBuilder<'a>) {
    if body
        .directives
        .iter()
        .any(|d| d.directive.as_str() == "worklet")
    {
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

/// Move `module.exports = …` / `exports.x = …` statements to the end of the
/// program body so they appear after the synthesized factories that may
/// reference them. Mirrors `dehoistCommonJSExports`.
fn dehoist_commonjs_exports<'a>(program: &mut Program<'a>, builder: AstBuilder<'a>) {
    let body = std::mem::replace(&mut program.body, builder.vec());
    let mut keep = builder.vec_with_capacity(body.len());
    let mut tail = Vec::new();
    for stmt in body {
        if is_common_js_export(&stmt) {
            tail.push(stmt);
        } else {
            keep.push(stmt);
        }
    }
    for s in tail {
        keep.push(s);
    }
    program.body = keep;
}

fn is_common_js_export(stmt: &Statement<'_>) -> bool {
    let Statement::ExpressionStatement(es) = stmt else {
        return false;
    };
    let Expression::AssignmentExpression(assign) = &es.expression else {
        return false;
    };
    let oxc_ast::ast::AssignmentTarget::StaticMemberExpression(member) = &assign.left else {
        return false;
    };
    let Expression::Identifier(obj) = &member.object else {
        return false;
    };
    obj.name.as_str() == "exports" || obj.name.as_str() == "module"
}

/// Avoid clippy unused.
#[allow(dead_code)]
fn _suppress(_: &str) {
    let _ = CONTEXT_OBJECT_MARKER;
}
