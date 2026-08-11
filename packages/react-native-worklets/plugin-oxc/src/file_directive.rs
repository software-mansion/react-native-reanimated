use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    Declaration, Expression, ExportDefaultDeclarationKind, ObjectExpression, ObjectPropertyKind,
    Program, Statement, VariableDeclarator,
};
use oxc_span::SPAN;

use crate::context_object::{append_marker, is_implicit_context_object};
use crate::utils::inject_worklet_directive;

pub const WORKLET_CLASS_MARKER: &str = "__workletClass";

pub fn process_file_directive<'a>(program: &mut Program<'a>, builder: AstBuilder<'a>) -> bool {
    let has_directive = program
        .directives
        .iter()
        .any(|d| d.directive.as_str() == "worklet");
    if !has_directive {
        return false;
    }

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
        Statement::ExportDefaultDeclaration(decl) => {
            match &mut decl.declaration {
                ExportDefaultDeclarationKind::FunctionDeclaration(func) => {
                    if let Some(body) = func.body.as_mut() {
                        inject_worklet_directive(body, builder);
                    }
                }
                ExportDefaultDeclarationKind::ClassDeclaration(class) => {
                    inject_class_marker(&mut class.body, builder);
                }
                other => {
                    if let Some(expr) = other.as_expression_mut() {
                        inject_into_expression(expr, builder);
                    }
                }
            }
            return;
        }
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
                return id.name.as_str() == WORKLET_CLASS_MARKER;
            }
        }
        false
    });
    if already {
        return;
    }
    let marker_value = builder.expression_boolean_literal(SPAN, true);
    let key = PropertyKey::StaticIdentifier(
        builder.alloc_identifier_name(SPAN, WORKLET_CLASS_MARKER),
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
    if is_implicit_context_object(obj) {
        append_marker(obj, builder);
        return;
    }
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
    obj.name.as_str() == "exports"
}

