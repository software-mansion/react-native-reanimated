use oxc_ast::ast::{
    Declaration, ExportDefaultDeclarationKind, Expression, ObjectExpression, ObjectPropertyKind,
    Program, Statement, VariableDeclarator,
};
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_span::{GetSpan, SPAN};

use crate::type_assertions::TypeAssertions;
use crate::utils::{inject_worklet_directive, is_object_method};

const WORKLET_CLASS_MARKER: &str = "__workletClass";

pub fn process_file_directive<'a>(
    program: &mut Program<'a>,
    builder: AstBuilder<'a>,
    assertions: &TypeAssertions,
) {
    let has_directive = program
        .directives
        .iter()
        .any(|d| d.directive.as_str() == "worklet");
    if !has_directive {
        return;
    }

    program
        .directives
        .retain(|d| d.directive.as_str() != "worklet");

    dehoist_commonjs_exports(program, builder, assertions);
    for stmt in program.body.iter_mut() {
        process_top_level(stmt, builder, assertions);
    }
}

fn process_top_level<'a>(
    stmt: &mut Statement<'a>,
    builder: AstBuilder<'a>,
    assertions: &TypeAssertions,
) {
    let candidate = match stmt {
        Statement::ExportNamedDeclaration(decl) => {
            if let Some(decl) = &mut decl.declaration {
                inject_into_declaration(decl, builder, assertions);
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
                        inject_into_expression(expr, builder, assertions);
                    }
                }
            }
            return;
        }
        s => s,
    };
    inject_into_statement(candidate, builder, assertions);
}

fn inject_into_statement<'a>(
    stmt: &mut Statement<'a>,
    builder: AstBuilder<'a>,
    assertions: &TypeAssertions,
) {
    if let Some(decl) = stmt.as_declaration_mut() {
        inject_into_declaration(decl, builder, assertions);
    }
}

fn inject_class_marker<'a>(body: &mut oxc_ast::ast::ClassBody<'a>, builder: AstBuilder<'a>) {
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
    let key =
        PropertyKey::StaticIdentifier(builder.alloc_identifier_name(SPAN, WORKLET_CLASS_MARKER));
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

fn inject_into_declaration<'a>(
    decl: &mut Declaration<'a>,
    builder: AstBuilder<'a>,
    assertions: &TypeAssertions,
) {
    match decl {
        Declaration::FunctionDeclaration(func) => {
            if let Some(body) = func.body.as_mut() {
                inject_worklet_directive(body, builder);
            }
        }
        Declaration::VariableDeclaration(vd) => {
            for d in vd.declarations.iter_mut() {
                inject_into_variable_declarator(d, builder, assertions);
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
    assertions: &TypeAssertions,
) {
    let Some(init) = &mut declarator.init else {
        return;
    };
    inject_into_expression(init, builder, assertions);
}

fn inject_into_expression<'a>(
    expr: &mut Expression<'a>,
    builder: AstBuilder<'a>,
    assertions: &TypeAssertions,
) {
    if assertions.hides(expr) {
        return;
    }
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
            inject_into_object_expression(obj, builder, assertions);
        }
        _ => {}
    }
}

fn inject_into_object_expression<'a>(
    obj: &mut ObjectExpression<'a>,
    builder: AstBuilder<'a>,
    assertions: &TypeAssertions,
) {
    for prop in obj.properties.iter_mut() {
        if let ObjectPropertyKind::ObjectProperty(prop) = prop {
            if is_object_method(prop) {
                if let Expression::FunctionExpression(func) = &mut prop.value {
                    if let Some(body) = func.body.as_mut() {
                        inject_worklet_directive(body, builder);
                    }
                }
            } else {
                inject_into_expression(&mut prop.value, builder, assertions);
            }
        }
    }
}

fn dehoist_commonjs_exports<'a>(
    program: &mut Program<'a>,
    builder: AstBuilder<'a>,
    assertions: &TypeAssertions,
) {
    let body = std::mem::replace(&mut program.body, builder.vec());
    let mut keep = builder.vec_with_capacity(body.len());
    let mut tail = Vec::new();
    for stmt in body {
        if is_common_js_export(&stmt, assertions) {
            tail.push(stmt);
        } else {
            keep.push(stmt);
        }
    }
    keep.extend(tail);
    program.body = keep;
}

fn is_common_js_export(stmt: &Statement<'_>, assertions: &TypeAssertions) -> bool {
    let Statement::ExpressionStatement(es) = stmt else {
        return false;
    };
    if assertions.hides(&es.expression) {
        return false;
    }
    let Expression::AssignmentExpression(assign) = &es.expression else {
        return false;
    };
    let Some(member) = assign.left.as_member_expression() else {
        return false;
    };
    if assertions.hides_span(assign.left.span()) {
        return false;
    }
    is_common_js_export_target(member.object(), member.static_property_name(), assertions)
}

fn is_common_js_export_target(
    object: &Expression<'_>,
    property: Option<&str>,
    assertions: &TypeAssertions,
) -> bool {
    if let Some(name) = assertions.identifier(object) {
        return name == "exports" || (name == "module" && property == Some("exports"));
    }
    match assertions.member_property(object) {
        Some((inner_object, inner_property)) => {
            is_common_js_export_target(inner_object, Some(inner_property), assertions)
        }
        None => false,
    }
}
