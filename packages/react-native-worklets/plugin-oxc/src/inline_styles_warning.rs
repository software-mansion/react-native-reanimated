use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    Argument, ArrayExpressionElement, Expression, FormalParameterKind, JSXAttribute,
    JSXAttributeName, JSXAttributeValue, JSXExpression, ObjectExpression, ObjectPropertyKind,
    Program, PropertyKey,
};
use oxc_ast_visit::{VisitMut, walk_mut};
use oxc_span::SPAN;

const WARNING_MODULE: &str = "react-native-reanimated";
const WARNING_GETTER: &str = "getUseOfValueInStyleWarning";

/// Mirrors `processInlineStylesWarning` in `plugin/src/inlineStylesWarning.ts`.
pub fn process_inline_styles_warning<'a>(program: &mut Program<'a>, builder: AstBuilder<'a>) {
    InlineStylesWarningPass { builder }.visit_program(program);
}

struct InlineStylesWarningPass<'a> {
    builder: AstBuilder<'a>,
}

impl<'a> InlineStylesWarningPass<'a> {
    fn process_style_object(&mut self, obj: &mut ObjectExpression<'a>) {
        for prop in obj.properties.iter_mut() {
            let ObjectPropertyKind::ObjectProperty(prop) = prop else {
                continue;
            };
            let is_transform = matches!(
                &prop.key,
                PropertyKey::StaticIdentifier(id) if id.name.as_str() == "transform"
            );
            if is_transform {
                self.process_transform_property(&mut prop.value);
            } else {
                self.process_property_value(&mut prop.value);
            }
        }
    }

    fn process_transform_property(&mut self, value: &mut Expression<'a>) {
        let Expression::ArrayExpression(array) = value else {
            return;
        };
        for element in array.elements.iter_mut() {
            if let ArrayExpressionElement::ObjectExpression(obj) = element {
                self.process_style_object(obj);
            }
        }
    }

    fn process_property_value(&mut self, value: &mut Expression<'a>) {
        let Expression::StaticMemberExpression(member) = value else {
            return;
        };
        if member.property.name.as_str() != "value" {
            return;
        }
        let original = std::mem::replace(value, self.builder.expression_null_literal(SPAN));
        *value = self.build_warning_iife(original);
    }

    fn build_warning_iife(&self, original: Expression<'a>) -> Expression<'a> {
        let module = self.builder.str(WARNING_MODULE);
        let require_call = self.builder.expression_call(
            SPAN,
            self.builder.expression_identifier(SPAN, "require"),
            NONE,
            {
                let mut args = self.builder.vec_with_capacity(1);
                args.push(Argument::from(
                    self.builder.expression_string_literal(SPAN, module, None),
                ));
                args
            },
            false,
        );
        let getter = Expression::from(self.builder.member_expression_static(
            SPAN,
            require_call,
            self.builder.identifier_name(SPAN, WARNING_GETTER),
            false,
        ));
        let warning =
            self.builder
                .expression_call(SPAN, getter, NONE, self.builder.vec(), false);

        let console_warn = Expression::from(self.builder.member_expression_static(
            SPAN,
            self.builder.expression_identifier(SPAN, "console"),
            self.builder.identifier_name(SPAN, "warn"),
            false,
        ));
        let warn_call = self.builder.expression_call(
            SPAN,
            console_warn,
            NONE,
            {
                let mut args = self.builder.vec_with_capacity(1);
                args.push(Argument::from(warning));
                args
            },
            false,
        );

        let mut statements = self.builder.vec_with_capacity(2);
        statements.push(self.builder.statement_expression(SPAN, warn_call));
        statements.push(self.builder.statement_return(SPAN, Some(original)));

        let params = self.builder.formal_parameters(
            SPAN,
            FormalParameterKind::ArrowFormalParameters,
            self.builder.vec(),
            NONE,
        );
        let arrow = self.builder.expression_arrow_function(
            SPAN,
            false,
            false,
            NONE,
            params,
            NONE,
            self.builder.function_body(SPAN, self.builder.vec(), statements),
        );

        self.builder
            .expression_call(SPAN, arrow, NONE, self.builder.vec(), false)
    }
}

impl<'a> VisitMut<'a> for InlineStylesWarningPass<'a> {
    fn visit_jsx_attribute(&mut self, attr: &mut JSXAttribute<'a>) {
        walk_mut::walk_jsx_attribute(self, attr);

        let JSXAttributeName::Identifier(name) = &attr.name else {
            return;
        };
        if name.name.as_str() != "style" {
            return;
        }
        let Some(JSXAttributeValue::ExpressionContainer(container)) = attr.value.as_mut() else {
            return;
        };
        match &mut container.expression {
            JSXExpression::ArrayExpression(array) => {
                for element in array.elements.iter_mut() {
                    if let ArrayExpressionElement::ObjectExpression(obj) = element {
                        self.process_style_object(obj);
                    }
                }
            }
            JSXExpression::ObjectExpression(obj) => self.process_style_object(obj),
            _ => {}
        }
    }
}
