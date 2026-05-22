use oxc_allocator::TakeIn;
use oxc_ast::AstBuilder;
use oxc_ast::ast::{
    Argument, ArrayExpression, ArrayExpressionElement, Expression, FormalParameterKind,
    FormalParameterRest, JSXAttribute, JSXAttributeName, JSXAttributeValue, JSXExpression,
    ObjectExpression, ObjectProperty, ObjectPropertyKind, PropertyKey, TSTypeAnnotation,
    TSTypeParameterDeclaration, TSTypeParameterInstantiation,
};
use oxc_span::SPAN;
use oxc_syntax::scope::ScopeFlags;
use oxc_traverse::TraverseCtx;

use crate::state::State;
use crate::utils::is_release;

type OptTypeArgs<'a> = Option<oxc_allocator::Box<'a, TSTypeParameterInstantiation<'a>>>;
type OptTypeParams<'a> = Option<oxc_allocator::Box<'a, TSTypeParameterDeclaration<'a>>>;
type OptReturnType<'a> = Option<oxc_allocator::Box<'a, TSTypeAnnotation<'a>>>;
type OptRest<'a> = Option<oxc_allocator::Box<'a, FormalParameterRest<'a>>>;

pub fn process_inline_styles_warning<'a>(
    attr: &mut JSXAttribute<'a>,
    state: &State,
    builder: AstBuilder<'a>,
    ctx: &mut TraverseCtx<'a, ()>,
) {
    if is_release() {
        return;
    }
    if state.opts.disable_inline_styles_warning.unwrap_or(false) {
        return;
    }

    let attr_name = match &attr.name {
        JSXAttributeName::Identifier(id) => id.name.as_str(),
        JSXAttributeName::NamespacedName(_) => return,
    };
    if attr_name != "style" {
        return;
    }

    let Some(JSXAttributeValue::ExpressionContainer(container)) = &mut attr.value else {
        return;
    };

    match &mut container.expression {
        JSXExpression::ArrayExpression(arr) => process_array_of_styles(arr, builder, ctx),
        JSXExpression::ObjectExpression(obj) => process_style_object(obj, builder, ctx),
        _ => {}
    }
}

fn process_array_of_styles<'a>(
    arr: &mut ArrayExpression<'a>,
    builder: AstBuilder<'a>,
    ctx: &mut TraverseCtx<'a, ()>,
) {
    for el in arr.elements.iter_mut() {
        if let ArrayExpressionElement::ObjectExpression(obj) = el {
            process_style_object(obj, builder, ctx);
        }
    }
}

fn process_style_object<'a>(
    obj: &mut ObjectExpression<'a>,
    builder: AstBuilder<'a>,
    ctx: &mut TraverseCtx<'a, ()>,
) {
    for prop in obj.properties.iter_mut() {
        let ObjectPropertyKind::ObjectProperty(prop) = prop else {
            continue;
        };
        let is_transform = matches!(
            &prop.key,
            PropertyKey::StaticIdentifier(id) if id.name.as_str() == "transform"
        );
        if is_transform {
            process_transform_property(prop, builder, ctx);
        } else {
            process_property_value(prop, builder, ctx);
        }
    }
}

fn process_transform_property<'a>(
    prop: &mut ObjectProperty<'a>,
    builder: AstBuilder<'a>,
    ctx: &mut TraverseCtx<'a, ()>,
) {
    let Expression::ArrayExpression(arr) = &mut prop.value else {
        return;
    };
    for el in arr.elements.iter_mut() {
        if let ArrayExpressionElement::ObjectExpression(obj) = el {
            process_style_object(obj, builder, ctx);
        }
    }
}

fn process_property_value<'a>(
    prop: &mut ObjectProperty<'a>,
    builder: AstBuilder<'a>,
    ctx: &mut TraverseCtx<'a, ()>,
) {
    let Expression::StaticMemberExpression(member) = &prop.value else {
        return;
    };
    if member.property.name.as_str() != "value" {
        return;
    }
    let taken = prop.value.take_in(builder);
    prop.value = build_warning_iife(taken, builder, ctx);
}

/// `(() => { console.warn(require('react-native-reanimated').getUseOfValueInStyleWarning()); return <expr>; })()`
fn build_warning_iife<'a>(
    original: Expression<'a>,
    builder: AstBuilder<'a>,
    ctx: &mut TraverseCtx<'a, ()>,
) -> Expression<'a> {
    let require_call = builder.expression_call(
        SPAN,
        builder.expression_identifier(SPAN, "require"),
        OptTypeArgs::None,
        {
            let mut args = builder.vec_with_capacity(1);
            args.push(Argument::from(
                builder.expression_string_literal(SPAN, "react-native-reanimated", None),
            ));
            args
        },
        false,
    );

    let warning_call = builder.expression_call(
        SPAN,
        Expression::from(builder.member_expression_static(
            SPAN,
            require_call,
            builder.identifier_name(SPAN, "getUseOfValueInStyleWarning"),
            false,
        )),
        OptTypeArgs::None,
        builder.vec(),
        false,
    );

    let console_warn = builder.expression_call(
        SPAN,
        Expression::from(builder.member_expression_static(
            SPAN,
            builder.expression_identifier(SPAN, "console"),
            builder.identifier_name(SPAN, "warn"),
            false,
        )),
        OptTypeArgs::None,
        {
            let mut args = builder.vec_with_capacity(1);
            args.push(Argument::from(warning_call));
            args
        },
        false,
    );

    let body_stmts = {
        let mut v = builder.vec_with_capacity(2);
        v.push(builder.statement_expression(SPAN, console_warn));
        v.push(builder.statement_return(SPAN, Some(original)));
        v
    };
    let body = builder.function_body(SPAN, builder.vec(), body_stmts);

    let params = builder.formal_parameters(
        SPAN,
        FormalParameterKind::ArrowFormalParameters,
        builder.vec(),
        OptRest::None,
    );
    let scope_id = ctx.create_child_scope_of_current(ScopeFlags::Arrow | ScopeFlags::Function);
    let arrow = builder.expression_arrow_function_with_scope_id_and_pure_and_pife(
        SPAN,
        false,
        false,
        OptTypeParams::None,
        params,
        OptReturnType::None,
        body,
        scope_id,
        false,
        false,
    );

    builder.expression_call(SPAN, arrow, OptTypeArgs::None, builder.vec(), false)
}
