use std::collections::{HashMap, HashSet};

use oxc_allocator::Allocator;
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    Argument, ArrowFunctionExpression, AssignmentExpression, AssignmentTarget, BindingPattern,
    CallExpression, Declaration, ExportDefaultDeclaration, ExportDefaultDeclarationKind,
    ExportNamedDeclaration, Expression, Function, FunctionBody, ObjectExpression, ObjectProperty,
    ObjectPropertyKind, Program, PropertyKey, PropertyKind, Statement, VariableDeclarationKind,
    VariableDeclarator,
};
use oxc_ast_visit::{VisitMut, walk_mut};
use oxc_semantic::Scoping;
use oxc_span::{GetSpan, SPAN, Span};
use oxc_syntax::scope::ScopeFlags;
use oxc_syntax::symbol::SymbolId;

use crate::auto_detect::{
    GESTURE_HANDLER_OBJECT_HOOKS, is_gesture_object_event_callback_method,
    is_layout_animation_callback_method,
};
use crate::closure::InjectedRef;
use crate::state::{State, WorkletizableKinds};
use crate::utils::{has_worklet_directive, inject_worklet_directive};
use crate::worklet_factory::{WorkletInput, make_worklet_factory};

const FUNCTION_HOOKS_ARG0: &[&str] = &[
    "useFrameCallback",
    "useAnimatedStyle",
    "useAnimatedProps",
    "createAnimatedPropAdapter",
    "useDerivedValue",
    "useAnimatedScrollHandler",
    "runOnUI",
    "executeOnUIRuntimeSync",
    "scheduleOnUI",
    "runOnUISync",
    "runOnUIAsync",
];

const FUNCTION_HOOKS_ARG01: &[&str] = &["useAnimatedReaction"];

const FUNCTION_HOOKS_ARG1: &[&str] = &[
    "withDecay",
    "runOnRuntime",
    "runOnRuntimeSync",
    "runOnRuntimeAsync",
    "scheduleOnRuntime",
    "runOnRuntimeSyncWithId",
    "scheduleOnRuntimeWithId",
];

const FUNCTION_HOOKS_ARG2: &[&str] = &["withTiming", "withSpring"];

const FUNCTION_HOOKS_ARG3: &[&str] = &["withRepeat"];

fn is_object_hook_at_arg0(name: &str) -> bool {
    name == "useAnimatedScrollHandler" || GESTURE_HANDLER_OBJECT_HOOKS.contains(&name)
}

/// `reanimatedFunctionHooks` accepts a function, `reanimatedObjectHooks`
/// accepts an object, and `useAnimatedScrollHandler` is in both.
fn hook_kinds(name: &str) -> WorkletizableKinds {
    let function = FUNCTION_HOOKS_ARG0.contains(&name)
        || FUNCTION_HOOKS_ARG01.contains(&name)
        || FUNCTION_HOOKS_ARG1.contains(&name)
        || FUNCTION_HOOKS_ARG2.contains(&name)
        || FUNCTION_HOOKS_ARG3.contains(&name);
    WorkletizableKinds {
        function,
        object: is_object_hook_at_arg0(name),
    }
}

const BOTH_KINDS: WorkletizableKinds = WorkletizableKinds {
    function: true,
    object: true,
};

const FUNCTION_KIND: WorkletizableKinds = WorkletizableKinds {
    function: true,
    object: false,
};

const OBJECT_KIND: WorkletizableKinds = WorkletizableKinds {
    function: false,
    object: true,
};

const WORKLET_HASH: &str = "__workletHash";

fn hook_argument_indices(name: &str) -> &'static [usize] {
    if FUNCTION_HOOKS_ARG0.contains(&name) || GESTURE_HANDLER_OBJECT_HOOKS.contains(&name) {
        &[0]
    } else if FUNCTION_HOOKS_ARG01.contains(&name) {
        &[0, 1]
    } else if FUNCTION_HOOKS_ARG1.contains(&name) {
        &[1]
    } else if FUNCTION_HOOKS_ARG2.contains(&name) {
        &[2]
    } else if FUNCTION_HOOKS_ARG3.contains(&name) {
        &[3]
    } else {
        &[]
    }
}

fn effective_callee<'e, 'a>(callee: &'e Expression<'a>) -> &'e Expression<'a> {
    match callee {
        Expression::SequenceExpression(seq) => seq.expressions.last().unwrap_or(callee),
        other => other,
    }
}

fn callee_name(callee: &Expression<'_>) -> Option<String> {
    match callee {
        Expression::Identifier(id) => Some(id.name.to_string()),
        Expression::StaticMemberExpression(m) => Some(m.property.name.to_string()),
        _ => None,
    }
}

pub fn process_program<'a>(
    program: &mut Program<'a>,
    state: &mut State,
    scoping: &Scoping,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    filename: &str,
) -> Vec<(String, String)> {
    let mut collector = Collector {
        scoping,
        out: ReferencedWorklets::default(),
    };
    oxc_ast_visit::Visit::visit_program(&mut collector, program);
    let mut referenced = collector.out;
    referenced.propagate();
    state.referenced_worklet_sites = referenced.injection_sites(scoping);
    state.referenced_worklet_symbols = referenced.kinds;

    {
        let mut pass = WorkletPass {
            state,
            scoping,
            builder,
            allocator,
            filename,
            injected_refs_stack: Vec::new(),
        };
        pass.visit_program(program);
    }

    std::mem::take(&mut state.emitted_files)
}

struct WorkletPass<'a, 'b> {
    state: &'b mut State,
    scoping: &'b Scoping,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    filename: &'b str,
    injected_refs_stack: Vec<HashSet<InjectedRef>>,
}

impl<'a, 'b> WorkletPass<'a, 'b> {
    fn record_injected_refs<I: IntoIterator<Item = InjectedRef>>(&mut self, refs: I) {
        if let Some(set) = self.injected_refs_stack.last_mut() {
            set.extend(refs);
        }
    }

    /// Walks a function in its own frame and hands the frame back instead of
    /// merging it into the parent. Callers that workletize the function pass it
    /// as `force_capture`; callers that don't must merge it into the parent
    /// themselves, otherwise the synthesized factory-call arguments left in the
    /// function body reference names nobody captures.
    fn walk_function_scoped(&mut self, func: &mut Function<'a>) -> HashSet<InjectedRef> {
        self.injected_refs_stack.push(HashSet::new());
        walk_mut::walk_function(self, func, ScopeFlags::Function);
        self.injected_refs_stack.pop().unwrap_or_default()
    }

    fn walk_arrow_scoped(
        &mut self,
        arrow: &mut ArrowFunctionExpression<'a>,
    ) -> HashSet<InjectedRef> {
        self.injected_refs_stack.push(HashSet::new());
        walk_mut::walk_arrow_function_expression(self, arrow);
        self.injected_refs_stack.pop().unwrap_or_default()
    }

    fn build_factory(
        &mut self,
        input: WorkletInput<'a, '_>,
        injected: &HashSet<InjectedRef>,
    ) -> (Expression<'a>, String) {
        let out = make_worklet_factory(
            input,
            self.state,
            self.scoping,
            self.builder,
            self.allocator,
            self.filename,
            injected,
        );
        self.record_injected_refs(out.injected_refs.iter().cloned());
        (out.factory_call, out.react_name)
    }

    fn workletize_function(
        &mut self,
        func: &Function<'a>,
        self_name: Option<&str>,
        injected: &HashSet<InjectedRef>,
    ) -> Option<(Expression<'a>, String)> {
        let body = func.body.as_ref()?;
        if !has_worklet_directive(body) {
            return None;
        }
        let input = WorkletInput {
            params: &func.params,
            body,
            is_async: func.r#async,
            is_generator: func.generator,
            function_scope_id: func.scope_id.get().unwrap_or(self.scoping.root_scope_id()),
            self_name,
            is_expression_body: false,
        };
        Some(self.build_factory(input, injected))
    }

    fn inject_hook_directives(&mut self, call: &mut CallExpression<'a>) {
        let callee = effective_callee(&call.callee);
        let name = callee_name(callee);
        let is_gesture = is_gesture_object_event_callback_method(callee);
        let is_layout_animation = is_layout_animation_callback_method(callee);

        if let Some(name) = name.as_deref() {
            let kinds = hook_kinds(name);
            for &index in hook_argument_indices(name) {
                if let Some(arg) = call.arguments.get_mut(index) {
                    inject_directive_into_hook_argument(arg, kinds, self.builder);
                }
            }
        }

        if is_gesture {
            for arg in call.arguments.iter_mut() {
                inject_directive_into_hook_argument(arg, BOTH_KINDS, self.builder);
            }
        }

        // A layout animation callback is matched by Babel on the function node
        // itself, so only an inline function qualifies.
        if is_layout_animation {
            for arg in call.arguments.iter_mut() {
                inject_directive_into_hook_argument(arg, FUNCTION_KIND, self.builder);
            }
        }
    }
}

impl<'a, 'b> VisitMut<'a> for WorkletPass<'a, 'b> {
    fn visit_function(&mut self, func: &mut Function<'a>, flags: ScopeFlags) {
        self.injected_refs_stack.push(HashSet::new());
        walk_mut::walk_function(self, func, flags);
        let popped = self.injected_refs_stack.pop().unwrap_or_default();
        self.record_injected_refs(popped);
    }

    fn visit_arrow_function_expression(&mut self, arrow: &mut ArrowFunctionExpression<'a>) {
        self.injected_refs_stack.push(HashSet::new());
        walk_mut::walk_arrow_function_expression(self, arrow);
        let popped = self.injected_refs_stack.pop().unwrap_or_default();
        self.record_injected_refs(popped);
    }

    fn visit_expression(&mut self, expr: &mut Expression<'a>) {
        match expr {
            Expression::ArrowFunctionExpression(arrow) => {
                let injected = self.walk_arrow_scoped(arrow);
                if !has_worklet_directive(&arrow.body) {
                    self.record_injected_refs(injected);
                    return;
                }
                let input = WorkletInput {
                    params: &arrow.params,
                    body: &arrow.body,
                    is_async: arrow.r#async,
                    is_generator: false,
                    function_scope_id: arrow
                        .scope_id
                        .get()
                        .unwrap_or(self.scoping.root_scope_id()),
                    self_name: None,
                    is_expression_body: arrow.expression,
                };
                let (factory_call, _) = self.build_factory(input, &injected);
                *expr = factory_call;
            }
            Expression::FunctionExpression(func) => {
                let injected = self.walk_function_scoped(func);
                let name = func.id.as_ref().map(|id| id.name.to_string());
                if let Some((factory_call, _)) =
                    self.workletize_function(func, name.as_deref(), &injected)
                {
                    *expr = factory_call;
                } else {
                    self.record_injected_refs(injected);
                }
            }
            _ => walk_mut::walk_expression(self, expr),
        }
    }

    fn visit_statement(&mut self, stmt: &mut Statement<'a>) {
        let Statement::FunctionDeclaration(func) = stmt else {
            walk_mut::walk_statement(self, stmt);
            return;
        };

        let binding_symbol = func.id.as_ref().and_then(|id| id.symbol_id.get());
        if let Some(body) = func.body.as_mut() {
            maybe_inject_referenced_directive(binding_symbol, body, self.state, self.builder);
        }

        let injected = self.walk_function_scoped(func);
        let name = func.id.as_ref().map(|id| id.name.to_string());
        let Some((factory_call, react_name)) =
            self.workletize_function(func, name.as_deref(), &injected)
        else {
            self.record_injected_refs(injected);
            return;
        };
        let decl_name = name.unwrap_or(react_name);
        *stmt = build_const_decl(self.builder, &decl_name, factory_call);
    }

    fn visit_export_default_declaration(&mut self, decl: &mut ExportDefaultDeclaration<'a>) {
        let ExportDefaultDeclarationKind::FunctionDeclaration(func) = &mut decl.declaration else {
            walk_mut::walk_export_default_declaration(self, decl);
            return;
        };

        let binding_symbol = func.id.as_ref().and_then(|id| id.symbol_id.get());
        if let Some(body) = func.body.as_mut() {
            maybe_inject_referenced_directive(binding_symbol, body, self.state, self.builder);
        }

        let injected = self.walk_function_scoped(func);
        let name = func.id.as_ref().map(|id| id.name.to_string());
        if let Some((factory_call, _)) = self.workletize_function(func, name.as_deref(), &injected) {
            decl.declaration = ExportDefaultDeclarationKind::from(factory_call);
        } else {
            self.record_injected_refs(injected);
        }
    }

    fn visit_export_named_declaration(&mut self, decl: &mut ExportNamedDeclaration<'a>) {
        let Some(Declaration::FunctionDeclaration(func)) = &mut decl.declaration else {
            walk_mut::walk_export_named_declaration(self, decl);
            return;
        };

        let binding_symbol = func.id.as_ref().and_then(|id| id.symbol_id.get());
        if let Some(body) = func.body.as_mut() {
            maybe_inject_referenced_directive(binding_symbol, body, self.state, self.builder);
        }

        let injected = self.walk_function_scoped(func);
        let name = func.id.as_ref().map(|id| id.name.to_string());
        let Some((factory_call, react_name)) =
            self.workletize_function(func, name.as_deref(), &injected)
        else {
            self.record_injected_refs(injected);
            return;
        };
        let decl_name = name.unwrap_or(react_name);
        if let Statement::VariableDeclaration(vd) =
            build_const_decl(self.builder, &decl_name, factory_call)
        {
            decl.declaration = Some(Declaration::VariableDeclaration(vd));
        }
    }

    fn visit_object_property(&mut self, prop: &mut ObjectProperty<'a>) {
        if !matches!(prop.value, Expression::FunctionExpression(_)) {
            walk_mut::walk_object_property(self, prop);
            return;
        }
        // An accessor can't be rewritten into a data property without losing
        // its get/set semantics, so refuse it the way the Babel plugin does.
        if prop.kind != PropertyKind::Init {
            let Expression::FunctionExpression(func) = &prop.value else {
                unreachable!()
            };
            let is_worklet = func
                .body
                .as_ref()
                .is_some_and(|body| has_worklet_directive(body));
            if is_worklet {
                if self.state.error.is_none() {
                    let kind = if prop.kind == PropertyKind::Get {
                        "getter"
                    } else {
                        "setter"
                    };
                    let name = match &prop.key {
                        PropertyKey::StaticIdentifier(id) => id.name.to_string(),
                        _ => "<computed>".to_string(),
                    };
                    self.state.error =
                        Some(format!("the `{name}` {kind} cannot be a worklet"));
                }
                return;
            }
            walk_mut::walk_object_property(self, prop);
            return;
        }
        if !prop.method {
            walk_mut::walk_object_property(self, prop);
            return;
        }

        let method_name = match &prop.key {
            PropertyKey::StaticIdentifier(id) => Some(id.name.to_string()),
            _ => None,
        };
        if prop.computed {
            self.visit_property_key(&mut prop.key);
        }
        let Expression::FunctionExpression(func) = &mut prop.value else {
            unreachable!()
        };
        let injected = self.walk_function_scoped(func);
        if let Some((factory_call, _)) =
            self.workletize_function(func, method_name.as_deref(), &injected)
        {
            prop.value = factory_call;
            prop.method = false;
        } else {
            self.record_injected_refs(injected);
        }
    }

    fn visit_call_expression(&mut self, call: &mut CallExpression<'a>) {
        self.inject_hook_directives(call);
        walk_mut::walk_call_expression(self, call);
    }

    fn visit_variable_declarator(&mut self, declarator: &mut VariableDeclarator<'a>) {
        let binding_symbol = match &declarator.id {
            BindingPattern::BindingIdentifier(bid) => bid.symbol_id.get(),
            _ => None,
        };
        if let (Some(symbol_id), Some(init)) = (binding_symbol, declarator.init.as_mut()) {
            if let Some(kinds) = self.state.referenced_worklet_symbols.get(&symbol_id).copied()
            {
                if self.state.referenced_worklet_sites.contains(&init.span()) {
                    inject_directive_into_expression(init, kinds, self.builder);
                }
            }
        }
        walk_mut::walk_variable_declarator(self, declarator);
    }

    fn visit_assignment_expression(&mut self, assign: &mut AssignmentExpression<'a>) {
        if let AssignmentTarget::AssignmentTargetIdentifier(lhs) = &assign.left {
            let symbol_id = lhs
                .reference_id
                .get()
                .and_then(|rid| self.scoping.get_reference(rid).symbol_id());
            if let Some(symbol_id) = symbol_id {
                if let Some(kinds) =
                    self.state.referenced_worklet_symbols.get(&symbol_id).copied()
                {
                    if self.state.referenced_worklet_sites.contains(&assign.right.span()) {
                        inject_directive_into_expression(&mut assign.right, kinds, self.builder);
                    }
                }
            }
        }
        walk_mut::walk_assignment_expression(self, assign);
    }

}

/// Everything `findReferencedWorklet` needs, gathered in one walk: which
/// bindings a hook refers to and in what shape, which of them the user already
/// tagged as hand-written worklets, and where each binding is defined.
#[derive(Default)]
struct ReferencedWorklets {
    kinds: HashMap<SymbolId, WorkletizableKinds>,
    hand_written: HashSet<SymbolId>,
    function_declarations: HashSet<SymbolId>,
    /// Every definition of a binding, in source order.
    definitions: HashMap<SymbolId, Vec<Definition>>,
    /// `lhs` is an alias for `rhs`.
    aliases: Vec<(SymbolId, SymbolId)>,
    /// `object` has an identifier-valued property bound to `value`.
    object_properties: Vec<(SymbolId, SymbolId)>,
}

struct Definition {
    span: Span,
    kinds: WorkletizableKinds,
    is_declarator: bool,
}

struct Collector<'s> {
    scoping: &'s Scoping,
    out: ReferencedWorklets,
}

impl<'a, 's> Collector<'s> {
    fn resolve(&self, id: &oxc_ast::ast::IdentifierReference<'a>) -> Option<SymbolId> {
        let rid = id.reference_id.get()?;
        self.scoping.get_reference(rid).symbol_id()
    }

    fn note(&mut self, sid: SymbolId, kinds: WorkletizableKinds) {
        let entry = self.out.kinds.entry(sid).or_default();
        *entry = entry.union(kinds);
    }

    fn note_arg(&mut self, arg: &Argument<'a>, kinds: WorkletizableKinds) {
        if let Argument::Identifier(id) = arg {
            if let Some(sid) = self.resolve(id) {
                self.note(sid, kinds);
            }
        }
        // `forEachWorkletizableObjectProperty` only ever accepts functions for
        // the property values of an object argument.
        if !kinds.object {
            return;
        }
        let Argument::ObjectExpression(obj) = arg else {
            return;
        };
        for value in object_property_identifiers(obj) {
            if let Some(sid) = self.resolve(value) {
                self.note(sid, FUNCTION_KIND);
            }
        }
    }

    /// `bindingIsWorklet` — a binding the user already tagged with
    /// `__workletHash` is hand-written and must be left alone. Babel's
    /// `isMemberExpression` is false for an optional chain, and its
    /// `isIdentifier(property)` is true for a computed identifier key.
    fn note_hand_written(&mut self, object: &Expression<'a>) {
        if let Expression::Identifier(object) = object {
            if let Some(sid) = self.resolve(object) {
                self.out.hand_written.insert(sid);
            }
        }
    }

    fn note_definition(&mut self, lhs: SymbolId, rhs: &Expression<'a>, is_declarator: bool) {
        if let Some(kinds) = workletizable_shape(rhs) {
            self.out.definitions.entry(lhs).or_default().push(Definition {
                span: rhs.span(),
                kinds,
                is_declarator,
            });
        }
        match rhs {
            Expression::Identifier(rhs) => {
                if let Some(rhs_sid) = self.resolve(rhs) {
                    self.out.aliases.push((lhs, rhs_sid));
                }
            }
            Expression::ObjectExpression(obj) => {
                for value in object_property_identifiers(obj) {
                    if let Some(value_sid) = self.resolve(value) {
                        self.out.object_properties.push((lhs, value_sid));
                    }
                }
            }
            _ => {}
        }
    }
}

impl<'a, 's> oxc_ast_visit::Visit<'a> for Collector<'s> {
    fn visit_static_member_expression(
        &mut self,
        member: &oxc_ast::ast::StaticMemberExpression<'a>,
    ) {
        oxc_ast_visit::walk::walk_static_member_expression(self, member);
        if !member.optional && member.property.name.as_str() == WORKLET_HASH {
            self.note_hand_written(&member.object);
        }
    }

    fn visit_computed_member_expression(
        &mut self,
        member: &oxc_ast::ast::ComputedMemberExpression<'a>,
    ) {
        oxc_ast_visit::walk::walk_computed_member_expression(self, member);
        let Expression::Identifier(key) = &member.expression else {
            return;
        };
        if !member.optional && key.name.as_str() == WORKLET_HASH {
            self.note_hand_written(&member.object);
        }
    }

    fn visit_call_expression(&mut self, call: &CallExpression<'a>) {
        oxc_ast_visit::walk::walk_call_expression(self, call);

        let callee = effective_callee(&call.callee);
        if let Some(name) = callee_name(callee).as_deref() {
            let kinds = hook_kinds(name);
            if kinds.function || kinds.object {
                for &index in hook_argument_indices(name) {
                    if let Some(arg) = call.arguments.get(index) {
                        self.note_arg(arg, kinds);
                    }
                }
            }
        }
        if is_gesture_object_event_callback_method(callee) {
            for arg in call.arguments.iter() {
                self.note_arg(arg, BOTH_KINDS);
            }
        }
    }

    fn visit_function(&mut self, func: &Function<'a>, flags: ScopeFlags) {
        oxc_ast_visit::walk::walk_function(self, func, flags);
        if !func.is_declaration() {
            return;
        }
        if let Some(sid) = func.id.as_ref().and_then(|id| id.symbol_id.get()) {
            self.out.function_declarations.insert(sid);
        }
    }

    fn visit_variable_declarator(&mut self, vd: &VariableDeclarator<'a>) {
        oxc_ast_visit::walk::walk_variable_declarator(self, vd);
        let BindingPattern::BindingIdentifier(id) = &vd.id else {
            return;
        };
        if let (Some(sid), Some(init)) = (id.symbol_id.get(), vd.init.as_ref()) {
            self.note_definition(sid, init, true);
        }
    }

    fn visit_assignment_expression(&mut self, ae: &AssignmentExpression<'a>) {
        oxc_ast_visit::walk::walk_assignment_expression(self, ae);
        let AssignmentTarget::AssignmentTargetIdentifier(lhs) = &ae.left else {
            return;
        };
        if let Some(sid) = self.resolve(lhs) {
            self.note_definition(sid, &ae.right, false);
        }
    }
}

fn object_property_identifiers<'e, 'a>(
    obj: &'e ObjectExpression<'a>,
) -> impl Iterator<Item = &'e oxc_ast::ast::IdentifierReference<'a>> {
    obj.properties.iter().filter_map(|prop| match prop {
        ObjectPropertyKind::ObjectProperty(p) => match &p.value {
            Expression::Identifier(id) => Some(&**id),
            _ => None,
        },
        _ => None,
    })
}

fn workletizable_shape(expr: &Expression<'_>) -> Option<WorkletizableKinds> {
    match expr {
        Expression::ArrowFunctionExpression(_) | Expression::FunctionExpression(_) => {
            Some(FUNCTION_KIND)
        }
        Expression::ObjectExpression(_) => Some(OBJECT_KIND),
        _ => None,
    }
}

impl ReferencedWorklets {
    /// The two ways `findReferencedWorklet` keeps looking past the binding it
    /// landed on: an identifier definition is an alias to follow, and an object
    /// it accepts has its identifier-valued properties workletized as functions.
    fn propagate(&mut self) {
        loop {
            let mut changed = false;
            let mut merge = |kinds: &mut HashMap<_, WorkletizableKinds>,
                             target,
                             extra: WorkletizableKinds| {
                let entry = kinds.entry(target).or_default();
                let merged = entry.union(extra);
                if merged.function != entry.function || merged.object != entry.object {
                    *entry = merged;
                    changed = true;
                }
            };
            for (lhs, rhs) in &self.aliases {
                if let Some(kinds) = self.kinds.get(lhs).copied() {
                    merge(&mut self.kinds, *rhs, kinds);
                }
            }
            for (object, value) in &self.object_properties {
                if self.kinds.get(object).is_some_and(|kinds| kinds.object) {
                    merge(&mut self.kinds, *value, FUNCTION_KIND);
                }
            }
            if !changed {
                break;
            }
        }
        self.kinds.retain(|sid, _| !self.hand_written.contains(sid));
    }

    /// A function-declaration binding wins outright; otherwise a constant
    /// binding resolves to its declarator init and a rebound one to its last
    /// definition of an accepted shape. Only that site gets a directive.
    fn injection_sites(&self, scoping: &Scoping) -> HashSet<Span> {
        let mut chosen = HashSet::new();
        for (sid, wanted) in &self.kinds {
            if self.function_declarations.contains(sid) {
                continue;
            }
            let Some(definitions) = self.definitions.get(sid) else {
                continue;
            };
            // `binding.constant` is false for any write, including ones whose
            // value isn't workletizable, and then only the writes are consulted.
            let rebound = is_rebound(scoping, *sid);
            let site = definitions
                .iter()
                .rev()
                .filter(|def| def.is_declarator != rebound)
                .find(|def| {
                    (wanted.function && def.kinds.function)
                        || (wanted.object && def.kinds.object)
                });
            if let Some(def) = site {
                chosen.insert(def.span);
            }
        }
        chosen
    }
}

fn is_rebound(scoping: &Scoping, symbol_id: SymbolId) -> bool {
    scoping.symbol_is_mutated(symbol_id)
        || !scoping.symbol_redeclarations(symbol_id).is_empty()
}

fn maybe_inject_referenced_directive<'a>(
    binding_symbol: Option<SymbolId>,
    body: &mut FunctionBody<'a>,
    state: &State,
    builder: AstBuilder<'a>,
) {
    let Some(sid) = binding_symbol else { return };
    if !state
        .referenced_worklet_symbols
        .get(&sid)
        .is_some_and(|kinds| kinds.function)
    {
        return;
    }
    inject_worklet_directive(body, builder);
}

/// Mirrors `forEachWorkletizableFunction` with `acceptObject: true` — the
/// referenced binding may resolve to an object literal of callbacks rather than
/// to a function.
fn inject_directive_into_hook_argument<'a>(
    arg: &mut Argument<'a>,
    kinds: WorkletizableKinds,
    builder: AstBuilder<'a>,
) {
    if let Some(expr) = arg.as_expression_mut() {
        inject_directive_into_expression(expr, kinds, builder);
    }
}

fn inject_directive_into_expression<'a>(
    expr: &mut Expression<'a>,
    kinds: WorkletizableKinds,
    builder: AstBuilder<'a>,
) {
    if let Expression::ObjectExpression(obj) = expr {
        if kinds.object {
            inject_worklet_directives_to_object_methods(obj, builder);
        }
        return;
    }
    if kinds.function {
        inject_directive_into_function_expression(expr, builder);
    }
}

fn inject_directive_into_function_expression<'a>(
    expr: &mut Expression<'a>,
    builder: AstBuilder<'a>,
) {
    match expr {
        Expression::ArrowFunctionExpression(arrow) => {
            inject_worklet_directive(&mut arrow.body, builder);
        }
        Expression::FunctionExpression(func) => {
            if let Some(body) = func.body.as_mut() {
                inject_worklet_directive(body, builder);
            }
        }
        _ => {}
    }
}

fn inject_worklet_directives_to_object_methods<'a>(
    obj: &mut ObjectExpression<'a>,
    builder: AstBuilder<'a>,
) {
    for prop in obj.properties.iter_mut() {
        if let ObjectPropertyKind::ObjectProperty(p) = prop {
            inject_directive_into_function_expression(&mut p.value, builder);
        }
    }
}

fn build_const_decl<'a>(
    builder: AstBuilder<'a>,
    name: &str,
    init: Expression<'a>,
) -> Statement<'a> {
    let id_pat = builder.binding_pattern_binding_identifier(SPAN, builder.ident(name));
    let declarator = builder.variable_declarator(
        SPAN,
        VariableDeclarationKind::Const,
        id_pat,
        NONE,
        Some(init),
        false,
    );
    let mut decls = builder.vec_with_capacity(1);
    decls.push(declarator);
    Statement::VariableDeclaration(builder.alloc_variable_declaration(
        SPAN,
        VariableDeclarationKind::Const,
        decls,
        false,
    ))
}
