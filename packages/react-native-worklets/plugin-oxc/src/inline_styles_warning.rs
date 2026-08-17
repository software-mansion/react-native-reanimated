use oxc_ast::ast::{
    Argument, ArrayExpressionElement, Expression, FormalParameterKind, JSXAttribute,
    JSXAttributeName, JSXAttributeValue, JSXExpression, ObjectExpression, ObjectPropertyKind,
    Program,
};
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast_visit::{walk_mut, VisitMut};
use oxc_span::SPAN;

use crate::type_assertions::TypeAssertions;

const WARNING_MODULE: &str = "react-native-reanimated";
const WARNING_GETTER: &str = "getUseOfValueInStyleWarning";

pub fn process_inline_styles_warning<'a>(
    program: &mut Program<'a>,
    builder: AstBuilder<'a>,
    assertions: &TypeAssertions,
) {
    InlineStylesWarningPass {
        builder,
        assertions,
    }
    .visit_program(program);
}

struct InlineStylesWarningPass<'a, 'b> {
    builder: AstBuilder<'a>,
    assertions: &'b TypeAssertions,
}

impl<'a, 'b> InlineStylesWarningPass<'a, 'b> {
    fn process_style_object(&mut self, obj: &mut ObjectExpression<'a>) {
        for prop in obj.properties.iter_mut() {
            let ObjectPropertyKind::ObjectProperty(prop) = prop else {
                continue;
            };
            if self.assertions.property_name(&prop.key) == Some("transform") {
                self.process_transform_property(&mut prop.value);
            } else {
                self.process_property_value(&mut prop.value);
            }
        }
    }

    fn process_transform_property(&mut self, value: &mut Expression<'a>) {
        if self.assertions.hides(value) {
            return;
        }
        let Expression::ArrayExpression(array) = value else {
            return;
        };
        self.process_style_array(array);
    }

    fn process_style_array(&mut self, array: &mut oxc_ast::ast::ArrayExpression<'a>) {
        for element in array.elements.iter_mut() {
            let ArrayExpressionElement::ObjectExpression(obj) = element else {
                continue;
            };
            if !self.assertions.hides_span(obj.span) {
                self.process_style_object(obj);
            }
        }
    }

    fn process_property_value(&mut self, value: &mut Expression<'a>) {
        if self.assertions.hides(value) {
            return;
        }
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
        let warning = self
            .builder
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
            self.builder
                .function_body(SPAN, self.builder.vec(), statements),
        );

        self.builder
            .expression_call(SPAN, arrow, NONE, self.builder.vec(), false)
    }
}

impl<'a, 'b> VisitMut<'a> for InlineStylesWarningPass<'a, 'b> {
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
        if container
            .expression
            .as_expression()
            .is_some_and(|expr| self.assertions.hides(expr))
        {
            return;
        }
        match &mut container.expression {
            JSXExpression::ArrayExpression(array) => self.process_style_array(array),
            JSXExpression::ObjectExpression(obj) => self.process_style_object(obj),
            _ => {}
        }
    }
}
