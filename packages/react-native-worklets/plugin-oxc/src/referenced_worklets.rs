use crate::ast::{assignment_identifier, is_object_method, object_expression};
use crate::closure::binding_is_rebound;

use std::collections::{HashMap, HashSet};

use oxc_ast::ast::{
    AssignmentExpression, AssignmentTarget, AssignmentTargetMaybeDefault, AssignmentTargetProperty,
    Expression, Function, ObjectExpression, ObjectPropertyKind, SimpleAssignmentTarget,
    VariableDeclarator,
};
use oxc_ast_visit::{Visit, walk};
use oxc_semantic::Scoping;
use oxc_span::{GetSpan, Span};
use oxc_syntax::scope::ScopeFlags;
use oxc_syntax::symbol::SymbolId;

const WORKLET_HASH: &str = "__workletHash";

#[derive(Clone)]
pub enum Shape {
    Function(Span),
    Object(Vec<Property>),
    Alias(SymbolId),
}

#[derive(Clone)]
pub enum Property {
    Method(Span),
    Value(Shape),
    Unsupported(&'static str),
}

pub struct Definitions<'s> {
    pub scoping: &'s Scoping,
    pub hand_written: HashSet<SymbolId>,
    pub function_declarations: HashMap<SymbolId, Span>,
    pub declarators: HashMap<SymbolId, Shape>,
    pub assignments: HashMap<SymbolId, Vec<Shape>>,
}

impl<'s> Definitions<'s> {
    fn resolve(&self, id: &oxc_ast::ast::IdentifierReference<'_>) -> Option<SymbolId> {
        let rid = id.reference_id.get()?;
        self.scoping.get_reference(rid).symbol_id()
    }

    pub fn describe(&self, expr: &Expression<'_>) -> Option<Shape> {
        if let Some(obj) = object_expression(expr) {
            return Some(Shape::Object(self.describe_object(obj)));
        }
        match expr {
            Expression::ArrowFunctionExpression(_) | Expression::FunctionExpression(_) => {
                Some(Shape::Function(expr.span()))
            }
            Expression::Identifier(id) => self.resolve(id).map(Shape::Alias),
            _ => None,
        }
    }

    fn describe_object(&self, obj: &ObjectExpression<'_>) -> Vec<Property> {
        obj.properties
            .iter()
            .filter_map(|prop| {
                let ObjectPropertyKind::ObjectProperty(prop) = prop else {
                    return Some(Property::Unsupported("SpreadElement"));
                };
                if is_object_method(prop) {
                    Some(Property::Method(prop.value.span()))
                } else {
                    self.describe(&prop.value).map(Property::Value)
                }
            })
            .collect()
    }

    fn note_hand_written(&mut self, object: &Expression<'_>) {
        if let Expression::Identifier(object) = object
            && let Some(sid) = self.resolve(object)
        {
            self.hand_written.insert(sid);
        }
    }

    pub fn is_rebound(&self, symbol_id: SymbolId) -> bool {
        binding_is_rebound(self.scoping, symbol_id)
    }
}

impl<'a, 's> Visit<'a> for Definitions<'s> {
    fn visit_static_member_expression(
        &mut self,
        member: &oxc_ast::ast::StaticMemberExpression<'a>,
    ) {
        walk::walk_static_member_expression(self, member);
        if !member.optional && member.property.name.as_str() == WORKLET_HASH {
            self.note_hand_written(&member.object);
        }
    }

    fn visit_computed_member_expression(
        &mut self,
        member: &oxc_ast::ast::ComputedMemberExpression<'a>,
    ) {
        walk::walk_computed_member_expression(self, member);
        if let Expression::Identifier(key) = &member.expression
            && !member.optional
            && key.name.as_str() == WORKLET_HASH
        {
            self.note_hand_written(&member.object);
        }
    }

    fn visit_function(&mut self, func: &Function<'a>, flags: ScopeFlags) {
        walk::walk_function(self, func, flags);
        if !func.is_declaration() {
            return;
        }
        if let Some(sid) = func.id.as_ref().and_then(|id| id.symbol_id.get()) {
            self.function_declarations.insert(sid, func.span);
        }
    }

    fn visit_variable_declarator(&mut self, vd: &VariableDeclarator<'a>) {
        walk::walk_variable_declarator(self, vd);
        let Some(init) = vd.init.as_ref() else {
            return;
        };
        let Some(shape) = self.describe(init) else {
            return;
        };
        for id in vd.id.get_binding_identifiers() {
            if let Some(sid) = id.symbol_id.get() {
                self.declarators.insert(sid, shape.clone());
            }
        }
    }

    fn visit_assignment_expression(&mut self, ae: &AssignmentExpression<'a>) {
        walk::walk_assignment_expression(self, ae);
        let Some(shape) = self.describe(&ae.right) else {
            return;
        };
        for sid in assignment_target_symbols(&ae.left, self.scoping) {
            self.assignments.entry(sid).or_default().push(shape.clone());
        }
    }

    fn visit_simple_assignment_target(&mut self, target: &SimpleAssignmentTarget<'a>) {
        walk::walk_simple_assignment_target(self, target);
    }
}

fn assignment_target_symbols(target: &AssignmentTarget<'_>, scoping: &Scoping) -> Vec<SymbolId> {
    fn collect(target: &AssignmentTarget<'_>, scoping: &Scoping, out: &mut Vec<SymbolId>) {
        match target {
            AssignmentTarget::ArrayAssignmentTarget(array) => {
                for element in array.elements.iter().flatten() {
                    collect_maybe_default(element, scoping, out);
                }
                if let Some(rest) = &array.rest {
                    collect(&rest.target, scoping, out);
                }
            }
            AssignmentTarget::ObjectAssignmentTarget(object) => {
                for property in object.properties.iter() {
                    match property {
                        AssignmentTargetProperty::AssignmentTargetPropertyIdentifier(prop) => {
                            push_symbol(&prop.binding, scoping, out);
                        }
                        AssignmentTargetProperty::AssignmentTargetPropertyProperty(prop) => {
                            collect_maybe_default(&prop.binding, scoping, out);
                        }
                    }
                }
                if let Some(rest) = &object.rest {
                    collect(&rest.target, scoping, out);
                }
            }
            target => {
                if let Some(id) = assignment_identifier(target) {
                    push_symbol(id, scoping, out);
                }
            }
        }
    }

    fn collect_maybe_default(
        element: &AssignmentTargetMaybeDefault<'_>,
        scoping: &Scoping,
        out: &mut Vec<SymbolId>,
    ) {
        match element {
            AssignmentTargetMaybeDefault::AssignmentTargetWithDefault(with_default) => {
                collect(&with_default.binding, scoping, out);
            }
            element => {
                if let Some(target) = element.as_assignment_target() {
                    collect(target, scoping, out);
                }
            }
        }
    }

    fn push_symbol(
        id: &oxc_ast::ast::IdentifierReference<'_>,
        scoping: &Scoping,
        out: &mut Vec<SymbolId>,
    ) {
        if let Some(sid) = id
            .reference_id
            .get()
            .and_then(|rid| scoping.get_reference(rid).symbol_id())
        {
            out.push(sid);
        }
    }

    let mut out = Vec::new();
    collect(target, scoping, &mut out);
    out
}
