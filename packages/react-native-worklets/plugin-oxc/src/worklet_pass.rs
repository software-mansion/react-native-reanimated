use std::collections::HashSet;

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
use oxc_span::SPAN;
use oxc_syntax::scope::ScopeFlags;
use oxc_syntax::symbol::SymbolId;

use crate::auto_detect::{
    GESTURE_HANDLER_OBJECT_HOOKS, is_gesture_object_event_callback_method,
    is_layout_animation_callback_method,
};
use crate::closure::InjectedRef;
use crate::state::State;
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
    state.referenced_worklet_symbols = collect_referenced_worklet_symbols(program, scoping);

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
            for &index in hook_argument_indices(name) {
                if let Some(arg) = call.arguments.get_mut(index) {
                    inject_directive_into_argument(arg, self.builder);
                }
            }
            if is_object_hook_at_arg0(name) {
                if let Some(Argument::ObjectExpression(obj)) = call.arguments.get_mut(0) {
                    inject_worklet_directives_to_object_methods(obj, self.builder);
                }
            }
        }

        if is_gesture || is_layout_animation {
            for arg in call.arguments.iter_mut() {
                match arg {
                    Argument::ObjectExpression(obj) => {
                        inject_worklet_directives_to_object_methods(obj, self.builder);
                    }
                    other => inject_directive_into_argument(other, self.builder),
                }
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
            if self.state.referenced_worklet_symbols.contains(&symbol_id) {
                inject_directive_into_expression(init, self.builder);
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
                if self.state.referenced_worklet_symbols.contains(&symbol_id) {
                    inject_directive_into_expression(&mut assign.right, self.builder);
                }
            }
        }
        walk_mut::walk_assignment_expression(self, assign);
    }

}

fn collect_referenced_worklet_symbols<'a>(
    program: &Program<'a>,
    scoping: &Scoping,
) -> HashSet<SymbolId> {
    use oxc_ast_visit::Visit;

    struct Pre<'s> {
        scoping: &'s Scoping,
        found: HashSet<SymbolId>,
    }

    impl<'a, 's> Pre<'s> {
        fn note_arg_identifier(&mut self, arg: &Argument<'a>) {
            if let Argument::Identifier(id) = arg {
                if let Some(rid) = id.reference_id.get() {
                    if let Some(sid) = self.scoping.get_reference(rid).symbol_id() {
                        self.found.insert(sid);
                    }
                }
            }
        }

        fn note_object_arg_property_idents(&mut self, arg: &Argument<'a>) {
            let Argument::ObjectExpression(obj) = arg else {
                return;
            };
            for prop in obj.properties.iter() {
                if let ObjectPropertyKind::ObjectProperty(p) = prop {
                    if let Expression::Identifier(id) = &p.value {
                        if let Some(rid) = id.reference_id.get() {
                            if let Some(sid) = self.scoping.get_reference(rid).symbol_id() {
                                self.found.insert(sid);
                            }
                        }
                    }
                }
            }
        }
    }

    impl<'a, 's> Visit<'a> for Pre<'s> {
        fn visit_call_expression(&mut self, call: &CallExpression<'a>) {
            oxc_ast_visit::walk::walk_call_expression(self, call);

            let callee = effective_callee(&call.callee);
            let name = callee_name(callee);

            if let Some(name) = name.as_deref() {
                for &index in hook_argument_indices(name) {
                    if let Some(arg) = call.arguments.get(index) {
                        self.note_arg_identifier(arg);
                    }
                }
                if is_object_hook_at_arg0(name) {
                    if let Some(arg0) = call.arguments.first() {
                        self.note_object_arg_property_idents(arg0);
                    }
                }
            }

            if is_gesture_object_event_callback_method(callee)
                || is_layout_animation_callback_method(callee)
            {
                for arg in call.arguments.iter() {
                    self.note_arg_identifier(arg);
                    self.note_object_arg_property_idents(arg);
                }
            }
        }
    }

    let mut pre = Pre {
        scoping,
        found: HashSet::new(),
    };
    pre.visit_program(program);
    let mut found = pre.found;

    expand_aliases(program, scoping, &mut found);
    found
}

fn expand_aliases<'a>(program: &Program<'a>, scoping: &Scoping, set: &mut HashSet<SymbolId>) {
    use oxc_ast_visit::Visit;

    struct Aliases<'s> {
        scoping: &'s Scoping,
        edges: Vec<(SymbolId, SymbolId)>,
    }

    impl<'s> Aliases<'s> {
        fn resolve_ref(&self, ident: &oxc_ast::ast::IdentifierReference<'_>) -> Option<SymbolId> {
            let rid = ident.reference_id.get()?;
            self.scoping.get_reference(rid).symbol_id()
        }
    }

    impl<'a, 's> Visit<'a> for Aliases<'s> {
        fn visit_variable_declarator(&mut self, vd: &VariableDeclarator<'a>) {
            oxc_ast_visit::walk::walk_variable_declarator(self, vd);
            let BindingPattern::BindingIdentifier(lhs) = &vd.id else {
                return;
            };
            let Some(lhs_sid) = lhs.symbol_id.get() else {
                return;
            };
            let Some(Expression::Identifier(rhs)) = &vd.init else {
                return;
            };
            if let Some(rhs_sid) = self.resolve_ref(rhs) {
                self.edges.push((lhs_sid, rhs_sid));
            }
        }

        fn visit_assignment_expression(&mut self, ae: &AssignmentExpression<'a>) {
            oxc_ast_visit::walk::walk_assignment_expression(self, ae);
            let AssignmentTarget::AssignmentTargetIdentifier(lhs) = &ae.left else {
                return;
            };
            let Some(lhs_sid) = self.resolve_ref(lhs) else {
                return;
            };
            let Expression::Identifier(rhs) = &ae.right else {
                return;
            };
            if let Some(rhs_sid) = self.resolve_ref(rhs) {
                self.edges.push((lhs_sid, rhs_sid));
            }
        }
    }

    let mut visitor = Aliases {
        scoping,
        edges: Vec::new(),
    };
    visitor.visit_program(program);

    loop {
        let before = set.len();
        for (lhs, rhs) in &visitor.edges {
            if set.contains(lhs) {
                set.insert(*rhs);
            }
        }
        if set.len() == before {
            break;
        }
    }
}

fn maybe_inject_referenced_directive<'a>(
    binding_symbol: Option<SymbolId>,
    body: &mut FunctionBody<'a>,
    state: &State,
    builder: AstBuilder<'a>,
) {
    let Some(sid) = binding_symbol else { return };
    if !state.referenced_worklet_symbols.contains(&sid) {
        return;
    }
    inject_worklet_directive(body, builder);
}

/// Mirrors `forEachWorkletizableFunction` with `acceptObject: true` — the
/// referenced binding may resolve to an object literal of callbacks rather than
/// to a function.
fn inject_directive_into_expression<'a>(expr: &mut Expression<'a>, builder: AstBuilder<'a>) {
    if let Expression::ObjectExpression(obj) = expr {
        inject_worklet_directives_to_object_methods(obj, builder);
        return;
    }
    inject_directive_into_function_expression(expr, builder);
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

fn inject_directive_into_argument<'a>(arg: &mut Argument<'a>, builder: AstBuilder<'a>) {
    match arg {
        Argument::ArrowFunctionExpression(arrow) => {
            inject_worklet_directive(&mut arrow.body, builder);
        }
        Argument::FunctionExpression(func) => {
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
