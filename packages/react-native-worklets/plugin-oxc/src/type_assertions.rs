use std::collections::HashSet;

use oxc_ast::ast::{
    AssignmentTarget, CallExpression, Expression, ObjectExpression, ObjectPropertyKind, Program,
    PropertyKey, SimpleAssignmentTarget,
};
use oxc_ast_visit::{walk, Visit};
use oxc_span::{GetSpan, Span};

#[derive(Default)]
pub struct TypeAssertions {
    wrapped: HashSet<Span>,
}

impl TypeAssertions {
    pub fn collect(program: &Program<'_>) -> Self {
        let mut assertions = Self::default();
        assertions.visit_program(program);
        assertions
    }

    pub fn hides(&self, expr: &Expression<'_>) -> bool {
        self.hides_span(expr.span())
    }

    pub fn hides_span(&self, span: Span) -> bool {
        self.wrapped.contains(&span)
    }

    pub fn call<'e, 'a>(&self, expr: &'e Expression<'a>) -> Option<&'e CallExpression<'a>> {
        match expr {
            Expression::CallExpression(call) if !self.hides(expr) => Some(call),
            _ => None,
        }
    }

    pub fn object<'e, 'a>(&self, expr: &'e Expression<'a>) -> Option<&'e ObjectExpression<'a>> {
        match expr {
            Expression::ObjectExpression(obj) if !self.hides(expr) => Some(obj),
            _ => None,
        }
    }

    pub fn identifier<'a>(&self, expr: &Expression<'a>) -> Option<&'a str> {
        match expr {
            Expression::Identifier(id) if !self.hides(expr) => Some(id.name.as_str()),
            _ => None,
        }
    }

    pub fn member_property<'e, 'a>(
        &self,
        expr: &'e Expression<'a>,
    ) -> Option<(&'e Expression<'a>, &'a str)> {
        if self.hides(expr) {
            return None;
        }
        match expr {
            Expression::StaticMemberExpression(member) => {
                Some((&member.object, member.property.name.as_str()))
            }
            Expression::ComputedMemberExpression(member) => self
                .identifier(&member.expression)
                .map(|name| (&member.object, name)),
            _ => None,
        }
    }

    pub fn member_object<'e, 'a>(&self, expr: &'e Expression<'a>) -> Option<&'e Expression<'a>> {
        if self.hides(expr) {
            return None;
        }
        expr.as_member_expression().map(|member| member.object())
    }

    pub fn property_name<'a>(&self, key: &PropertyKey<'a>) -> Option<&'a str> {
        match key {
            PropertyKey::StaticIdentifier(id) => Some(id.name.as_str()),
            key => key.as_expression().and_then(|expr| self.identifier(expr)),
        }
    }

    pub fn assignment_identifier<'e, 'a>(
        &self,
        target: &'e AssignmentTarget<'a>,
    ) -> Option<&'e oxc_ast::ast::IdentifierReference<'a>> {
        match target {
            AssignmentTarget::AssignmentTargetIdentifier(id) if !self.hides_span(id.span) => {
                Some(id)
            }
            _ => None,
        }
    }

    pub fn is_named_data_property(&self, prop: &ObjectPropertyKind<'_>, name: &str) -> bool {
        let ObjectPropertyKind::ObjectProperty(prop) = prop else {
            return false;
        };
        !crate::utils::is_object_method(prop) && self.property_name(&prop.key) == Some(name)
    }
}

impl<'a> Visit<'a> for TypeAssertions {
    fn visit_expression(&mut self, expr: &Expression<'a>) {
        walk::walk_expression(self, expr);
        let inner = match expr {
            Expression::TSAsExpression(e) => &e.expression,
            Expression::TSSatisfiesExpression(e) => &e.expression,
            Expression::TSNonNullExpression(e) => &e.expression,
            Expression::TSTypeAssertion(e) => &e.expression,
            _ => return,
        };
        self.wrapped.insert(inner.span());
    }

    fn visit_simple_assignment_target(&mut self, target: &SimpleAssignmentTarget<'a>) {
        walk::walk_simple_assignment_target(self, target);
        let inner = match target {
            SimpleAssignmentTarget::TSAsExpression(e) => &e.expression,
            SimpleAssignmentTarget::TSSatisfiesExpression(e) => &e.expression,
            SimpleAssignmentTarget::TSNonNullExpression(e) => &e.expression,
            SimpleAssignmentTarget::TSTypeAssertion(e) => &e.expression,
            _ => return,
        };
        self.wrapped.insert(inner.span());
    }
}
