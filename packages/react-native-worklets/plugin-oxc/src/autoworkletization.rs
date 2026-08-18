use std::collections::{HashMap, HashSet};

use oxc_ast::ast::{ArrowFunctionExpression, CallExpression, Expression, Function, Program};
use oxc_ast::AstBuilder;
use oxc_ast_visit::{walk, walk_mut, Visit, VisitMut};
use oxc_semantic::Scoping;
use oxc_span::Span;
use oxc_syntax::scope::ScopeFlags;
use oxc_syntax::symbol::SymbolId;

use crate::gesture_handler_autoworkletization::{
    is_gesture_object_event_callback_method, GESTURE_HANDLER_OBJECT_HOOKS,
};
use crate::layout_animation_autoworkletization::is_layout_animation_callback_method;
use crate::referenced_worklets::{Definitions, Property, Shape};
use crate::utils::{identifier_name, inject_worklet_directive, member_property};

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

#[rustfmt::skip]
pub const FUNCTION_HOOKS: &[(&str, &[usize])] = &[
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

fn callee_name<'a>(callee: &Expression<'a>) -> Option<&'a str> {
    if let Some(name) = identifier_name(callee) {
        return Some(name);
    }
    match callee {
        Expression::ChainExpression(chain) => chain
            .expression
            .as_member_expression()
            .and_then(|member| member.static_property_name()),
        other => member_property(other).map(|(_, name)| name),
    }
}

pub fn add_directives_to_known_callbacks<'a>(
    program: &mut Program<'a>,
    scoping: &Scoping,
    builder: AstBuilder<'a>,
) -> Option<String> {
    let mut definitions = Definitions {
        scoping,
        hand_written: HashSet::new(),
        function_declarations: HashMap::new(),
        declarators: HashMap::new(),
        assignments: HashMap::new(),
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

    callbacks.error
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
        let callee = effective_callee(&call.callee);
        let arguments = |index: usize| {
            call.arguments
                .get(index)
                .and_then(|arg| arg.as_expression())
                .and_then(|expr| self.definitions.describe(expr))
        };

        if let Some((kinds, indices)) = callee_name(callee).and_then(hook) {
            for shape in indices.iter().filter_map(|&index| arguments(index)) {
                self.collect(&shape, kinds, true);
            }
        }
        if is_gesture_object_event_callback_method(callee) {
            for shape in (0..call.arguments.len()).filter_map(arguments) {
                self.collect(&shape, BOTH, true);
            }
        }
        if is_layout_animation_callback_method(&call.callee) {
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
