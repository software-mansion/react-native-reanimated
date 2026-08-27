use oxc_ast::ast::{
    Declaration, ExportDefaultDeclarationKind, Expression, MemberExpression, ObjectExpression,
    ObjectPropertyKind, Program, Statement, VariableDeclarator,
};
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_span::SPAN;

use crate::utils::{add_worklet_directives_to_function_body, is_object_method};

const WORKLET_CLASS_MARKER: &str = "__workletClass";

pub fn process_file_directive<'a>(program: &mut Program<'a>, builder: AstBuilder<'a>) -> bool {
    let has_directive = program
        .directives
        .iter()
        .any(|d| d.directive.as_str() == "worklet");
    if !has_directive {
        return false;
    }

    program
        .directives
        .retain(|d| d.directive.as_str() != "worklet");

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
                        add_worklet_directives_to_function_body(body, builder);
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
    if let Some(decl) = candidate.as_declaration_mut() {
        inject_into_declaration(decl, builder);
    }
}

fn inject_class_marker<'a>(body: &mut oxc_ast::ast::ClassBody<'a>, builder: AstBuilder<'a>) {
    use oxc_ast::ast::{PropertyDefinitionType, PropertyKey};
    let key =
        PropertyKey::StaticIdentifier(builder.alloc_identifier_name(SPAN, WORKLET_CLASS_MARKER));
    body.body.push(builder.class_element_property_definition(
        SPAN,
        PropertyDefinitionType::PropertyDefinition,
        builder.vec(),
        key,
        NONE,
        Some(builder.expression_boolean_literal(SPAN, true)),
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        None,
    ));
}

fn inject_into_declaration<'a>(decl: &mut Declaration<'a>, builder: AstBuilder<'a>) {
    match decl {
        Declaration::FunctionDeclaration(func) => {
            if let Some(body) = func.body.as_mut() {
                add_worklet_directives_to_function_body(body, builder);
            }
        }
        Declaration::VariableDeclaration(vd) => {
            for declarator in vd.declarations.iter_mut() {
                inject_into_variable_declarator(declarator, builder);
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
    if let Some(init) = &mut declarator.init {
        inject_into_expression(init, builder);
    }
}

fn inject_into_expression<'a>(expr: &mut Expression<'a>, builder: AstBuilder<'a>) {
    match expr {
        Expression::ArrowFunctionExpression(arrow) => {
            add_worklet_directives_to_function_body(&mut arrow.body, builder);
        }
        Expression::FunctionExpression(func) => {
            if let Some(body) = func.body.as_mut() {
                add_worklet_directives_to_function_body(body, builder);
            }
        }
        Expression::ObjectExpression(obj) => inject_into_object_expression(obj, builder),
        _ => {}
    }
}

fn inject_into_object_expression<'a>(obj: &mut ObjectExpression<'a>, builder: AstBuilder<'a>) {
    for prop in obj.properties.iter_mut() {
        let ObjectPropertyKind::ObjectProperty(prop) = prop else {
            continue;
        };
        if is_object_method(prop) {
            if let Expression::FunctionExpression(func) = &mut prop.value {
                if let Some(body) = func.body.as_mut() {
                    add_worklet_directives_to_function_body(body, builder);
                }
            }
        } else {
            inject_into_expression(&mut prop.value, builder);
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
    keep.extend(tail);
    program.body = keep;
}

fn is_common_js_export(stmt: &Statement<'_>) -> bool {
    let Statement::ExpressionStatement(es) = stmt else {
        return false;
    };
    let Expression::AssignmentExpression(assign) = &es.expression else {
        return false;
    };
    let Some(member) = assign.left.as_member_expression() else {
        return false;
    };
    is_common_js_export_target(member)
}

fn is_common_js_export_target(target: &MemberExpression<'_>) -> bool {
    match target.object() {
        Expression::Identifier(id) => {
            id.name == "exports" || (id.name == "module" && is_exports_property(target))
        }
        object => object
            .as_member_expression()
            .is_some_and(is_common_js_export_target),
    }
}

fn is_exports_property(target: &MemberExpression<'_>) -> bool {
    match target {
        MemberExpression::ComputedMemberExpression(member) => {
            matches!(&member.expression, Expression::StringLiteral(lit) if lit.value == "exports")
        }
        MemberExpression::StaticMemberExpression(member) => member.property.name == "exports",
        MemberExpression::PrivateFieldExpression(_) => false,
    }
}
