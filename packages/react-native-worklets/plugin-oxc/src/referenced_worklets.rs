use std::collections::{HashMap, HashSet};

use oxc_ast::ast::{
    ArrowFunctionExpression, AssignmentExpression, AssignmentTarget, AssignmentTargetMaybeDefault,
    AssignmentTargetProperty, CallExpression, Expression, Function, ObjectExpression,
    ObjectPropertyKind, Program, SimpleAssignmentTarget, VariableDeclarator,
};
use oxc_ast::AstBuilder;
use oxc_ast_visit::{walk, walk_mut, Visit, VisitMut};
use oxc_semantic::Scoping;
use oxc_span::{GetSpan, Span};
use oxc_syntax::scope::ScopeFlags;
use oxc_syntax::symbol::SymbolId;

use crate::auto_detect::{
    is_gesture_object_event_callback_method, is_layout_animation_callback_method,
    GESTURE_HANDLER_OBJECT_HOOKS,
};
use crate::state::binding_is_rebound;
use crate::type_assertions::TypeAssertions;
use crate::utils::inject_worklet_directive;
use crate::utils::is_object_method;

const WORKLET_HASH: &str = "__workletHash";

#[derive(Clone, Copy)]
struct Kinds {
    function: bool,
    object: bool,
}

const FUNCTION: Kinds = Kinds {
    function: true,
    object: false,
};

const BOTH: Kinds = Kinds {
    function: true,
    object: true,
};

#[derive(Clone)]
enum Shape {
    Function(Span),
    Object(Vec<Property>),
    Alias(SymbolId),
}

#[derive(Clone)]
enum Property {
    Method(Span),
    Value(Shape),
    Unsupported(&'static str),
}

#[rustfmt::skip]
const FUNCTION_HOOKS: &[(&str, &[usize])] = &[
    ("useFrameCallback", &[0]),
    ("useAnimatedStyle", &[0]),
    ("useAnimatedProps", &[0]),
    ("createAnimatedPropAdapter", &[0]),
    ("useDerivedValue", &[0]),
    ("useAnimatedScrollHandler", &[0]),
    ("useAnimatedReaction", &[0, 1]),
    ("withTiming", &[2]),
    ("withSpring", &[2]),
    ("withDecay", &[1]),
    ("withRepeat", &[3]),
    ("runOnUI", &[0]),
    ("executeOnUIRuntimeSync", &[0]),
    ("scheduleOnUI", &[0]),
    ("runOnUISync", &[0]),
    ("runOnUIAsync", &[0]),
    ("runOnRuntime", &[1]),
    ("runOnRuntimeSync", &[1]),
    ("runOnRuntimeAsync", &[1]),
    ("scheduleOnRuntime", &[1]),
    ("runOnRuntimeSyncWithId", &[1]),
    ("scheduleOnRuntimeWithId", &[1]),
];

fn hook(name: &str) -> Option<(Kinds, &'static [usize])> {
    let function = FUNCTION_HOOKS.iter().find(|(hook, _)| *hook == name);
    let object = name == "useAnimatedScrollHandler" || GESTURE_HANDLER_OBJECT_HOOKS.contains(&name);
    match (function, object) {
        (None, false) => None,
        (function, object) => Some((
            Kinds {
                function: function.is_some(),
                object,
            },
            function.map_or(&[0][..], |(_, indices)| indices),
        )),
    }
}

fn effective_callee<'e, 'a>(callee: &'e Expression<'a>) -> &'e Expression<'a> {
    match callee {
        Expression::SequenceExpression(seq) => seq.expressions.last().unwrap_or(callee),
        other => other,
    }
}

fn callee_name<'a>(callee: &Expression<'a>, assertions: &TypeAssertions) -> Option<&'a str> {
    if let Some(name) = assertions.identifier(callee) {
        return Some(name);
    }
    match callee {
        Expression::ChainExpression(chain) => chain
            .expression
            .as_member_expression()
            .and_then(|member| member.static_property_name()),
        other => assertions.member_property(other).map(|(_, name)| name),
    }
}

pub fn add_directives_to_known_callbacks<'a>(
    program: &mut Program<'a>,
    scoping: &Scoping,
    builder: AstBuilder<'a>,
    type_asserted: &TypeAssertions,
) -> (Option<String>, HashMap<SymbolId, usize>) {
    let mut definitions = Definitions {
        scoping,
        type_asserted,
        hand_written: HashSet::new(),
        function_declarations: HashMap::new(),
        declarators: HashMap::new(),
        assignments: HashMap::new(),
        hidden_writes: HashMap::new(),
    };
    definitions.visit_program(program);

    let mut callbacks = Callbacks {
        definitions: &definitions,
        sites: HashSet::new(),
        optional_calls: HashSet::new(),
        error: None,
    };
    callbacks.visit_program(program);

    DirectiveInjector {
        sites: callbacks.sites,
        builder,
    }
    .visit_program(program);

    (callbacks.error, definitions.hidden_writes)
}

struct Definitions<'s> {
    scoping: &'s Scoping,
    type_asserted: &'s TypeAssertions,
    hand_written: HashSet<SymbolId>,
    function_declarations: HashMap<SymbolId, Span>,
    declarators: HashMap<SymbolId, Shape>,
    assignments: HashMap<SymbolId, Vec<Shape>>,
    hidden_writes: HashMap<SymbolId, usize>,
}

impl<'s> Definitions<'s> {
    fn resolve(&self, id: &oxc_ast::ast::IdentifierReference<'_>) -> Option<SymbolId> {
        let rid = id.reference_id.get()?;
        self.scoping.get_reference(rid).symbol_id()
    }

    fn describe(&self, expr: &Expression<'_>) -> Option<Shape> {
        if let Some(obj) = self.type_asserted.object(expr) {
            return Some(Shape::Object(self.describe_object(obj)));
        }
        if self.type_asserted.hides(expr) {
            return None;
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
        if self.type_asserted.hides(object) {
            return;
        }
        if let Expression::Identifier(object) = object {
            if let Some(sid) = self.resolve(object) {
                self.hand_written.insert(sid);
            }
        }
    }

    fn note_hidden_write(&mut self, id: &oxc_ast::ast::IdentifierReference<'_>) {
        if !self.type_asserted.hides_span(id.span) {
            return;
        }
        if let Some(sid) = self.resolve(id) {
            *self.hidden_writes.entry(sid).or_default() += 1;
        }
    }

    fn is_rebound(&self, symbol_id: SymbolId) -> bool {
        binding_is_rebound(self.scoping, &self.hidden_writes, symbol_id)
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
        if let Expression::Identifier(key) = &member.expression {
            if !member.optional && key.name.as_str() == WORKLET_HASH {
                self.note_hand_written(&member.object);
            }
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
        for sid in assignment_target_symbols(&ae.left, self.scoping, self.type_asserted) {
            self.assignments.entry(sid).or_default().push(shape.clone());
        }
    }

    fn visit_simple_assignment_target(&mut self, target: &SimpleAssignmentTarget<'a>) {
        walk::walk_simple_assignment_target(self, target);
        if let SimpleAssignmentTarget::AssignmentTargetIdentifier(id) = target {
            self.note_hidden_write(id);
        }
    }
}

struct Callbacks<'d, 's> {
    definitions: &'d Definitions<'s>,
    sites: HashSet<Span>,
    optional_calls: HashSet<Span>,
    error: Option<String>,
}

impl<'d, 's> Callbacks<'d, 's> {
    fn collect(&mut self, shape: &Shape, kinds: Kinds, follow_bindings: bool) {
        self.collect_inner(shape, kinds, follow_bindings, &mut HashSet::new());
    }

    fn collect_inner(
        &mut self,
        shape: &Shape,
        kinds: Kinds,
        follow_bindings: bool,
        seen: &mut HashSet<SymbolId>,
    ) {
        match shape {
            Shape::Function(span) if kinds.function => {
                self.sites.insert(*span);
            }
            Shape::Object(properties) if kinds.object => {
                for property in properties {
                    match property {
                        Property::Method(span) => {
                            self.sites.insert(*span);
                        }
                        Property::Value(value) => self.collect_inner(value, FUNCTION, true, seen),
                        Property::Unsupported(kind) => {
                            self.error.get_or_insert_with(|| {
                                format!(
                                    "'{kind}' as to-be workletized argument is not \
                                     supported for object hooks."
                                )
                            });
                        }
                    }
                }
            }
            Shape::Alias(sid) if follow_bindings => self.collect_binding(*sid, kinds, seen),
            _ => {}
        }
    }

    fn collect_binding(&mut self, sid: SymbolId, kinds: Kinds, seen: &mut HashSet<SymbolId>) {
        if !seen.insert(sid) || self.definitions.hand_written.contains(&sid) {
            return;
        }
        if kinds.function {
            if let Some(span) = self.definitions.function_declarations.get(&sid) {
                self.sites.insert(*span);
                return;
            }
        }
        if self.definitions.is_rebound(sid) {
            let last = self
                .definitions
                .assignments
                .get(&sid)
                .and_then(|shapes| shapes.iter().rev().find(|shape| has_shape(shape, kinds)));
            if let Some(shape) = last {
                self.collect_inner(shape, kinds, false, seen);
            }
        } else if let Some(init) = self.definitions.declarators.get(&sid) {
            self.collect_inner(init, kinds, true, seen);
        }
    }
}

fn assignment_target_symbols(
    target: &AssignmentTarget<'_>,
    scoping: &Scoping,
    assertions: &TypeAssertions,
) -> Vec<SymbolId> {
    fn collect(
        target: &AssignmentTarget<'_>,
        scoping: &Scoping,
        assertions: &TypeAssertions,
        out: &mut Vec<SymbolId>,
    ) {
        match target {
            AssignmentTarget::ArrayAssignmentTarget(array) => {
                for element in array.elements.iter().flatten() {
                    collect_maybe_default(element, scoping, assertions, out);
                }
                if let Some(rest) = &array.rest {
                    collect(&rest.target, scoping, assertions, out);
                }
            }
            AssignmentTarget::ObjectAssignmentTarget(object) => {
                for property in object.properties.iter() {
                    match property {
                        AssignmentTargetProperty::AssignmentTargetPropertyIdentifier(prop) => {
                            push_symbol(&prop.binding, scoping, assertions, out);
                        }
                        AssignmentTargetProperty::AssignmentTargetPropertyProperty(prop) => {
                            collect_maybe_default(&prop.binding, scoping, assertions, out);
                        }
                    }
                }
                if let Some(rest) = &object.rest {
                    collect(&rest.target, scoping, assertions, out);
                }
            }
            target => {
                if let Some(id) = assertions.assignment_identifier(target) {
                    push_symbol(id, scoping, assertions, out);
                }
            }
        }
    }

    fn collect_maybe_default(
        element: &AssignmentTargetMaybeDefault<'_>,
        scoping: &Scoping,
        assertions: &TypeAssertions,
        out: &mut Vec<SymbolId>,
    ) {
        match element {
            AssignmentTargetMaybeDefault::AssignmentTargetWithDefault(with_default) => {
                collect(&with_default.binding, scoping, assertions, out);
            }
            element => {
                if let Some(target) = element.as_assignment_target() {
                    collect(target, scoping, assertions, out);
                }
            }
        }
    }

    fn push_symbol(
        id: &oxc_ast::ast::IdentifierReference<'_>,
        scoping: &Scoping,
        assertions: &TypeAssertions,
        out: &mut Vec<SymbolId>,
    ) {
        if assertions.hides_span(id.span) {
            return;
        }
        if let Some(sid) = id
            .reference_id
            .get()
            .and_then(|rid| scoping.get_reference(rid).symbol_id())
        {
            out.push(sid);
        }
    }

    let mut out = Vec::new();
    collect(target, scoping, assertions, &mut out);
    out
}

fn has_shape(shape: &Shape, kinds: Kinds) -> bool {
    match shape {
        Shape::Function(_) => kinds.function,
        Shape::Object(_) => kinds.object,
        Shape::Alias(_) => false,
    }
}

impl<'a, 'd, 's> Visit<'a> for Callbacks<'d, 's> {
    fn visit_chain_expression(&mut self, chain: &oxc_ast::ast::ChainExpression<'a>) {
        match &chain.expression {
            oxc_ast::ast::ChainElement::CallExpression(call) => {
                if mark_optional_calls(&call.callee, &mut self.optional_calls) || call.optional {
                    self.optional_calls.insert(call.span);
                }
            }
            element => {
                if let Some(member) = element.as_member_expression() {
                    mark_optional_calls(member.object(), &mut self.optional_calls);
                }
            }
        }
        walk::walk_chain_expression(self, chain);
    }

    fn visit_call_expression(&mut self, call: &CallExpression<'a>) {
        walk::walk_call_expression(self, call);

        if self.optional_calls.contains(&call.span) {
            return;
        }
        let assertions = self.definitions.type_asserted;
        if assertions.hides(&call.callee) {
            return;
        }
        let callee = effective_callee(&call.callee);
        let arguments = |index: usize| {
            call.arguments
                .get(index)
                .and_then(|arg| arg.as_expression())
                .and_then(|expr| self.definitions.describe(expr))
        };

        if let Some((kinds, indices)) = callee_name(callee, assertions).and_then(hook) {
            for shape in indices.iter().filter_map(|&index| arguments(index)) {
                self.collect(&shape, kinds, true);
            }
        }
        if is_gesture_object_event_callback_method(callee, assertions) {
            for shape in (0..call.arguments.len()).filter_map(arguments) {
                self.collect(&shape, BOTH, true);
            }
        }
        if is_layout_animation_callback_method(&call.callee, assertions) {
            for shape in (0..call.arguments.len()).filter_map(arguments) {
                self.collect(&shape, FUNCTION, false);
            }
        }
    }
}

fn mark_optional_calls(expr: &Expression<'_>, out: &mut HashSet<Span>) -> bool {
    match expr {
        Expression::CallExpression(call) => {
            let optional = mark_optional_calls(&call.callee, out) || call.optional;
            if optional {
                out.insert(call.span);
            }
            optional
        }
        expr => expr
            .as_member_expression()
            .is_some_and(|member| mark_optional_calls(member.object(), out) || member.optional()),
    }
}

struct DirectiveInjector<'a> {
    sites: HashSet<Span>,
    builder: AstBuilder<'a>,
}

impl<'a> VisitMut<'a> for DirectiveInjector<'a> {
    fn visit_function(&mut self, func: &mut Function<'a>, flags: ScopeFlags) {
        if self.sites.contains(&func.span) {
            if let Some(body) = func.body.as_mut() {
                inject_worklet_directive(body, self.builder);
            }
        }
        walk_mut::walk_function(self, func, flags);
    }

    fn visit_arrow_function_expression(&mut self, arrow: &mut ArrowFunctionExpression<'a>) {
        if self.sites.contains(&arrow.span) {
            inject_worklet_directive(&mut arrow.body, self.builder);
        }
        walk_mut::walk_arrow_function_expression(self, arrow);
    }
}
