use oxc_allocator::Allocator;
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    Argument, Declaration, Expression, ObjectExpression, ObjectPropertyKind, Program, PropertyKey,
    Statement, VariableDeclarationKind, VariableDeclarator,
};
use oxc_semantic::Scoping;
use oxc_span::SPAN;

use crate::auto_detect::{
    GESTURE_HANDLER_OBJECT_HOOKS, is_gesture_object_event_callback_method,
    is_layout_animation_callback_method,
};
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
    name == "useAnimatedScrollHandler"
        || crate::auto_detect::GESTURE_HANDLER_OBJECT_HOOKS.contains(&name)
}

pub struct PrependCtx<'a> {
    function_stack: Vec<Vec<Statement<'a>>>,
    pub injected_refs_stack: Vec<std::collections::HashSet<String>>,
}

impl<'a> PrependCtx<'a> {
    pub fn new() -> Self {
        Self {
            function_stack: Vec::new(),
            injected_refs_stack: Vec::new(),
        }
    }


    pub fn push_frame(&mut self) {
        self.function_stack.push(Vec::new());
        self.injected_refs_stack
            .push(std::collections::HashSet::new());
    }

    pub fn pop_frame(&mut self) -> (Vec<Statement<'a>>, std::collections::HashSet<String>) {
        (
            self.function_stack.pop().unwrap_or_default(),
            self.injected_refs_stack.pop().unwrap_or_default(),
        )
    }

    pub fn record_injected_refs<I: IntoIterator<Item = String>>(&mut self, names: I) {
        if let Some(set) = self.injected_refs_stack.last_mut() {
            set.extend(names);
        }
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

    let old_body = std::mem::replace(&mut program.body, builder.vec());
    let mut new_body = builder.vec_with_capacity(old_body.len());

    for stmt in old_body {
        let mut ctx = PrependCtx::new();
        let processed = process_top_level_statement(
            stmt, &mut ctx, state, scoping, builder, allocator, filename,
        );
        new_body.push(processed);
    }

    program.body = new_body;
    std::mem::take(&mut state.emitted_files)
}

fn collect_referenced_worklet_symbols<'a>(
    program: &Program<'a>,
    scoping: &Scoping,
) -> std::collections::HashSet<oxc_syntax::symbol::SymbolId> {
    use oxc_ast::ast::{CallExpression, Expression};
    use oxc_ast_visit::Visit;
    use oxc_syntax::symbol::SymbolId;

    struct Pre<'s> {
        scoping: &'s Scoping,
        found: std::collections::HashSet<SymbolId>,
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
                if let oxc_ast::ast::ObjectPropertyKind::ObjectProperty(p) = prop {
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

            let effective_callee: &Expression<'_> = match &call.callee {
                Expression::SequenceExpression(seq) => seq
                    .expressions
                    .last()
                    .unwrap_or(&call.callee),
                other => other,
            };
            let name = match effective_callee {
                Expression::Identifier(id) => Some(id.name.as_str().to_string()),
                Expression::StaticMemberExpression(m) => Some(m.property.name.as_str().to_string()),
                _ => None,
            };

            let arg_indices_buf: Vec<usize>;
            let arg_indices: &[usize] = if let Some(name) = name.as_deref() {
                if FUNCTION_HOOKS_ARG0.contains(&name)
                    || crate::auto_detect::GESTURE_HANDLER_OBJECT_HOOKS.contains(&name)
                {
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
            } else {
                &[]
            };

            for &i in arg_indices {
                if let Some(arg) = call.arguments.get(i) {
                    self.note_arg_identifier(arg);
                }
            }

            if let Some(name) = name.as_deref() {
                if is_object_hook_at_arg0(name) {
                    if let Some(arg0) = call.arguments.first() {
                        self.note_object_arg_property_idents(arg0);
                    }
                }
            }

            if is_gesture_object_event_callback_method(effective_callee)
                || is_layout_animation_callback_method(effective_callee)
            {
                arg_indices_buf = (0..call.arguments.len()).collect();
                for &i in &arg_indices_buf {
                    if let Some(arg) = call.arguments.get(i) {
                        self.note_arg_identifier(arg);
                        self.note_object_arg_property_idents(arg);
                    }
                }
            }
        }
    }

    let mut pre = Pre {
        scoping,
        found: std::collections::HashSet::new(),
    };
    pre.visit_program(program);
    let mut found = pre.found;

    expand_aliases(program, scoping, &mut found);
    found
}

fn expand_aliases<'a>(
    program: &Program<'a>,
    scoping: &Scoping,
    set: &mut std::collections::HashSet<oxc_syntax::symbol::SymbolId>,
) {
    use oxc_ast::ast::{
        AssignmentExpression, AssignmentTarget, BindingPattern, Expression, VariableDeclarator,
    };
    use oxc_ast_visit::Visit;
    use oxc_syntax::symbol::SymbolId;

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
    binding_symbol: Option<oxc_syntax::symbol::SymbolId>,
    body: &mut oxc_ast::ast::FunctionBody<'a>,
    state: &State,
    builder: AstBuilder<'a>,
) {
    let Some(sid) = binding_symbol else { return };
    if !state.referenced_worklet_symbols.contains(&sid) {
        return;
    }
    inject_worklet_directive(body, builder);
}

fn process_body_with_frame<'a>(
    body_stmts: &mut oxc_allocator::Vec<'a, Statement<'a>>,
    ctx: &mut PrependCtx<'a>,
    state: &mut State,
    scoping: &Scoping,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    filename: &str,
) -> std::collections::HashSet<String> {
    ctx.push_frame();
    process_statements(body_stmts, ctx, state, scoping, builder, allocator, filename);
    let (local, injected) = ctx.pop_frame();
    if !local.is_empty() {
        let old = std::mem::replace(body_stmts, builder.vec());
        let mut new = builder.vec_with_capacity(old.len() + local.len());
        for s in local {
            new.push(s);
        }
        for s in old {
            new.push(s);
        }
        *body_stmts = new;
    }
    injected
}

fn process_top_level_statement<'a>(
    stmt: Statement<'a>,
    ctx: &mut PrependCtx<'a>,
    state: &mut State,
    scoping: &Scoping,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    filename: &str,
) -> Statement<'a> {
    match stmt {
        Statement::ClassDeclaration(mut class) => {
            if crate::worklet_class::is_worklet_class(&class) {
                crate::worklet_class::remove_worklet_class_marker(&mut class.body, builder);
            }
            process_class_body(
                &mut class.body, ctx, state, scoping, builder, allocator, filename,
            );
            Statement::ClassDeclaration(class)
        }
        Statement::FunctionDeclaration(mut func) => {
            let func_id_sym = func.id.as_ref().and_then(|id| id.symbol_id.get());
            if let Some(body) = func.body.as_mut() {
                maybe_inject_referenced_directive(func_id_sym, body, state, builder);
            }
            if let Some(body) = &func.body {
                if has_worklet_directive(body) {
                    let injected = if let Some(body_mut) = func.body.as_mut() {
                        process_body_with_frame(
                            &mut body_mut.statements, ctx, state, scoping, builder, allocator, filename,
                        )
                    } else {
                        std::collections::HashSet::new()
                    };
                    let name = func.id.as_ref().map(|id| id.name.to_string());
                    let scope_id = func.scope_id.get().unwrap_or(scoping.root_scope_id());
                    let body_ref = func
                        .body
                        .as_ref()
                        .expect("function body presence checked above");
                    let input = WorkletInput {
                        params: &func.params,
                        body: body_ref,
                        is_async: func.r#async,
                        is_generator: func.generator,
                        function_scope_id: scope_id,
                        self_name: name.as_deref(),
                        is_expression_body: false,
                    };
                    let out = make_worklet_factory(
                        input, state, scoping, builder, allocator, filename, &injected,
                    );
                    ctx.record_injected_refs(out.injected_ref_names.iter().cloned());
                    let decl_name = name.unwrap_or_else(|| out.react_name.clone());
                    return build_const_decl(builder, &decl_name, out.factory_call);
                }
            }
            if let Some(body) = func.body.as_mut() {
                process_body_with_frame(
                    &mut body.statements, ctx, state, scoping, builder, allocator, filename,
                );
            }
            Statement::FunctionDeclaration(func)
        }
        Statement::VariableDeclaration(mut vd) => {
            for declarator in vd.declarations.iter_mut() {
                process_variable_declarator(
                    declarator, ctx, state, scoping, builder, allocator, filename,
                );
            }
            Statement::VariableDeclaration(vd)
        }
        Statement::ExpressionStatement(mut es) => {
            process_expression(
                &mut es.expression,
                ctx,
                state,
                scoping,
                builder,
                allocator,
                filename,
            );
            Statement::ExpressionStatement(es)
        }
        Statement::BlockStatement(mut block) => {
            process_statements(
                &mut block.body, ctx, state, scoping, builder, allocator, filename,
            );
            Statement::BlockStatement(block)
        }
        Statement::IfStatement(mut s) => {
            process_expression(&mut s.test, ctx, state, scoping, builder, allocator, filename);
            recurse_into_stmt(&mut s.consequent, ctx, state, scoping, builder, allocator, filename);
            if let Some(alt) = &mut s.alternate {
                recurse_into_stmt(alt, ctx, state, scoping, builder, allocator, filename);
            }
            Statement::IfStatement(s)
        }
        Statement::WhileStatement(mut s) => {
            process_expression(&mut s.test, ctx, state, scoping, builder, allocator, filename);
            recurse_into_stmt(&mut s.body, ctx, state, scoping, builder, allocator, filename);
            Statement::WhileStatement(s)
        }
        Statement::DoWhileStatement(mut s) => {
            process_expression(&mut s.test, ctx, state, scoping, builder, allocator, filename);
            recurse_into_stmt(&mut s.body, ctx, state, scoping, builder, allocator, filename);
            Statement::DoWhileStatement(s)
        }
        Statement::ForStatement(mut s) => {
            if let Some(test) = &mut s.test {
                process_expression(test, ctx, state, scoping, builder, allocator, filename);
            }
            if let Some(update) = &mut s.update {
                process_expression(update, ctx, state, scoping, builder, allocator, filename);
            }
            recurse_into_stmt(&mut s.body, ctx, state, scoping, builder, allocator, filename);
            Statement::ForStatement(s)
        }
        Statement::ForInStatement(mut s) => {
            process_expression(&mut s.right, ctx, state, scoping, builder, allocator, filename);
            recurse_into_stmt(&mut s.body, ctx, state, scoping, builder, allocator, filename);
            Statement::ForInStatement(s)
        }
        Statement::ForOfStatement(mut s) => {
            process_expression(&mut s.right, ctx, state, scoping, builder, allocator, filename);
            recurse_into_stmt(&mut s.body, ctx, state, scoping, builder, allocator, filename);
            Statement::ForOfStatement(s)
        }
        Statement::TryStatement(mut s) => {
            process_statements(
                &mut s.block.body, ctx, state, scoping, builder, allocator, filename,
            );
            if let Some(handler) = &mut s.handler {
                process_statements(
                    &mut handler.body.body, ctx, state, scoping, builder, allocator, filename,
                );
            }
            if let Some(finalizer) = &mut s.finalizer {
                process_statements(
                    &mut finalizer.body, ctx, state, scoping, builder, allocator, filename,
                );
            }
            Statement::TryStatement(s)
        }
        Statement::SwitchStatement(mut s) => {
            process_expression(&mut s.discriminant, ctx, state, scoping, builder, allocator, filename);
            for case in s.cases.iter_mut() {
                if let Some(test) = &mut case.test {
                    process_expression(test, ctx, state, scoping, builder, allocator, filename);
                }
                process_statements(
                    &mut case.consequent, ctx, state, scoping, builder, allocator, filename,
                );
            }
            Statement::SwitchStatement(s)
        }
        Statement::LabeledStatement(mut s) => {
            recurse_into_stmt(&mut s.body, ctx, state, scoping, builder, allocator, filename);
            Statement::LabeledStatement(s)
        }
        Statement::ThrowStatement(mut s) => {
            process_expression(&mut s.argument, ctx, state, scoping, builder, allocator, filename);
            Statement::ThrowStatement(s)
        }
        Statement::ReturnStatement(mut s) => {
            if let Some(arg) = &mut s.argument {
                process_expression(arg, ctx, state, scoping, builder, allocator, filename);
            }
            Statement::ReturnStatement(s)
        }
        Statement::ExportDefaultDeclaration(mut decl) => {
            use oxc_ast::ast::ExportDefaultDeclarationKind;
            match &mut decl.declaration {
                ExportDefaultDeclarationKind::FunctionDeclaration(func) => {
                    let is_worklet = func
                        .body
                        .as_ref()
                        .map(|b| has_worklet_directive(b))
                        .unwrap_or(false);
                    if is_worklet {
                        let injected = if let Some(body_mut) = func.body.as_mut() {
                            process_body_with_frame(
                                &mut body_mut.statements, ctx, state, scoping, builder, allocator, filename,
                            )
                        } else {
                            std::collections::HashSet::new()
                        };
                        let name = func.id.as_ref().map(|id| id.name.to_string());
                        let scope_id = func
                            .scope_id
                            .get()
                            .unwrap_or(scoping.root_scope_id());
                        let body_ref = func
                        .body
                        .as_ref()
                        .expect("function body presence checked above");
                        let input = WorkletInput {
                            params: &func.params,
                            body: body_ref,
                            is_async: func.r#async,
                            is_generator: func.generator,
                            function_scope_id: scope_id,
                            self_name: name.as_deref(),
                            is_expression_body: false,
                        };
                        let out = make_worklet_factory(
                            input, state, scoping, builder, allocator, filename, &injected,
                        );
                        ctx.record_injected_refs(out.injected_ref_names.iter().cloned());
                        decl.declaration =
                            ExportDefaultDeclarationKind::from(out.factory_call);
                    } else if let Some(body) = func.body.as_mut() {
                        process_body_with_frame(
                            &mut body.statements,
                            ctx,
                            state,
                            scoping,
                            builder,
                            allocator,
                            filename,
                        );
                    }
                }
                ExportDefaultDeclarationKind::ClassDeclaration(class) => {
                    process_class_body(
                        &mut class.body, ctx, state, scoping, builder, allocator, filename,
                    );
                }
                _ => {
                    if let Some(expr) = decl.declaration.as_expression_mut() {
                        process_expression(
                            expr, ctx, state, scoping, builder, allocator, filename,
                        );
                    }
                }
            }
            Statement::ExportDefaultDeclaration(decl)
        }
        Statement::ExportNamedDeclaration(mut decl) => {
            if let Some(Declaration::FunctionDeclaration(func)) = &mut decl.declaration {
                if let Some(body) = &func.body {
                    if has_worklet_directive(body) {
                        let injected = if let Some(body_mut) = func.body.as_mut() {
                            process_body_with_frame(
                                &mut body_mut.statements, ctx, state, scoping, builder, allocator, filename,
                            )
                        } else {
                            std::collections::HashSet::new()
                        };
                        let name = func
                            .id
                            .as_ref()
                            .map(|id| id.name.to_string())
                            .unwrap_or_default();
                        let scope_id = func
                            .scope_id
                            .get()
                            .unwrap_or(scoping.root_scope_id());
                        let body_ref = func
                        .body
                        .as_ref()
                        .expect("function body presence checked above");
                        let input = WorkletInput {
                            params: &func.params,
                            body: body_ref,
                            is_async: func.r#async,
                            is_generator: func.generator,
                            function_scope_id: scope_id,
                            self_name: if name.is_empty() { None } else { Some(&name) },
                            is_expression_body: false,
                        };
                        let out = make_worklet_factory(
                            input, state, scoping, builder, allocator, filename, &injected,
                        );
                        ctx.record_injected_refs(out.injected_ref_names.iter().cloned());
                        let decl_name =
                            if name.is_empty() { out.react_name.clone() } else { name };
                        let new_stmt =
                            build_const_decl(builder, &decl_name, out.factory_call);
                        if let Statement::VariableDeclaration(vd) = new_stmt {
                            decl.declaration =
                                Some(Declaration::VariableDeclaration(vd));
                        }
                        return Statement::ExportNamedDeclaration(decl);
                    }
                }
            }
            if let Some(declaration) = &mut decl.declaration {
                process_inner_declaration(
                    declaration, ctx, state, scoping, builder, allocator, filename,
                );
            }
            Statement::ExportNamedDeclaration(decl)
        }
        other => other,
    }
}

fn process_class_body<'a>(
    body: &mut oxc_ast::ast::ClassBody<'a>,
    ctx: &mut PrependCtx<'a>,
    state: &mut State,
    scoping: &Scoping,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    filename: &str,
) {
    use oxc_ast::ast::ClassElement;
    for el in body.body.iter_mut() {
        match el {
            ClassElement::MethodDefinition(m) => {
                if let Some(body) = m.value.body.as_mut() {
                    process_body_with_frame(
                        &mut body.statements, ctx, state, scoping, builder, allocator, filename,
                    );
                }
            }
            ClassElement::PropertyDefinition(p) => {
                if let Some(value) = &mut p.value {
                    process_expression(
                        value, ctx, state, scoping, builder, allocator, filename,
                    );
                }
            }
            ClassElement::AccessorProperty(a) => {
                if let Some(value) = &mut a.value {
                    process_expression(
                        value, ctx, state, scoping, builder, allocator, filename,
                    );
                }
            }
            ClassElement::StaticBlock(b) => {
                process_body_with_frame(
                    &mut b.body, ctx, state, scoping, builder, allocator, filename,
                );
            }
            _ => {}
        }
    }
}

fn recurse_into_stmt<'a>(
    stmt: &mut Statement<'a>,
    ctx: &mut PrependCtx<'a>,
    state: &mut State,
    scoping: &Scoping,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    filename: &str,
) {
    use oxc_span::SPAN;
    let placeholder = builder.statement_empty(SPAN);
    let owned = std::mem::replace(stmt, placeholder);
    *stmt = process_top_level_statement(
        owned, ctx, state, scoping, builder, allocator, filename,
    );
}

fn process_statements<'a>(
    stmts: &mut oxc_allocator::Vec<'a, Statement<'a>>,
    ctx: &mut PrependCtx<'a>,
    state: &mut State,
    scoping: &Scoping,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    filename: &str,
) {
    let old = std::mem::replace(stmts, builder.vec());
    let mut new_stmts = builder.vec_with_capacity(old.len());
    for s in old {
        let processed =
            process_top_level_statement(s, ctx, state, scoping, builder, allocator, filename);
        new_stmts.push(processed);
    }
    *stmts = new_stmts;
}

fn process_inner_declaration<'a>(
    decl: &mut Declaration<'a>,
    ctx: &mut PrependCtx<'a>,
    state: &mut State,
    scoping: &Scoping,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    filename: &str,
) {
    match decl {
        Declaration::VariableDeclaration(vd) => {
            for declarator in vd.declarations.iter_mut() {
                process_variable_declarator(
                    declarator, ctx, state, scoping, builder, allocator, filename,
                );
            }
        }
        Declaration::FunctionDeclaration(func) => {
            if let Some(body) = func.body.as_mut() {
                process_body_with_frame(
                    &mut body.statements, ctx, state, scoping, builder, allocator, filename,
                );
            }
        }
        Declaration::ClassDeclaration(class) => {
            process_class_body(
                &mut class.body, ctx, state, scoping, builder, allocator, filename,
            );
        }
        _ => {}
    }
}

fn process_variable_declarator<'a>(
    declarator: &mut VariableDeclarator<'a>,
    ctx: &mut PrependCtx<'a>,
    state: &mut State,
    scoping: &Scoping,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    filename: &str,
) {
    let binding_symbol = match &declarator.id {
        oxc_ast::ast::BindingPattern::BindingIdentifier(bid) => bid.symbol_id.get(),
        _ => None,
    };
    if let (Some(sid), Some(init)) = (binding_symbol, declarator.init.as_mut()) {
        if state.referenced_worklet_symbols.contains(&sid) {
            match init {
                oxc_ast::ast::Expression::ArrowFunctionExpression(arrow) => {
                    inject_worklet_directive(&mut arrow.body, builder);
                }
                oxc_ast::ast::Expression::FunctionExpression(func) => {
                    if let Some(body) = func.body.as_mut() {
                        inject_worklet_directive(body, builder);
                    }
                }
                _ => {}
            }
        }
    }
    let Some(init) = &mut declarator.init else {
        return;
    };
    process_expression(init, ctx, state, scoping, builder, allocator, filename);
}

fn process_expression<'a>(
    expr: &mut Expression<'a>,
    ctx: &mut PrependCtx<'a>,
    state: &mut State,
    scoping: &Scoping,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    filename: &str,
) {
    match expr {
        Expression::ArrowFunctionExpression(arrow) => {
            if has_worklet_directive(&arrow.body) {
                let injected = process_body_with_frame(
                    &mut arrow.body.statements,
                    ctx,
                    state,
                    scoping,
                    builder,
                    allocator,
                    filename,
                );
                let scope_id = arrow.scope_id.get().unwrap_or(scoping.root_scope_id());
                let input = WorkletInput {
                    params: &arrow.params,
                    body: &arrow.body,
                    is_async: arrow.r#async,
                    is_generator: false,
                    function_scope_id: scope_id,
                    self_name: None,
                    is_expression_body: arrow.expression,
                };
                let out = make_worklet_factory(
                    input, state, scoping, builder, allocator, filename, &injected,
                );
                ctx.record_injected_refs(out.injected_ref_names.iter().cloned());
                *expr = out.factory_call;
            } else {
                process_body_with_frame(
                    &mut arrow.body.statements,
                    ctx,
                    state,
                    scoping,
                    builder,
                    allocator,
                    filename,
                );
            }
        }
        Expression::FunctionExpression(func) => {
            if let Some(body) = &func.body {
                if has_worklet_directive(body) {
                    let injected = if let Some(body_mut) = func.body.as_mut() {
                        process_body_with_frame(
                            &mut body_mut.statements,
                            ctx,
                            state,
                            scoping,
                            builder,
                            allocator,
                            filename,
                        )
                    } else {
                        std::collections::HashSet::new()
                    };
                    let name = func.id.as_ref().map(|id| id.name.to_string());
                    let scope_id = func.scope_id.get().unwrap_or(scoping.root_scope_id());
                    let body_ref = func
                        .body
                        .as_ref()
                        .expect("function body presence checked above");
                    let input = WorkletInput {
                        params: &func.params,
                        body: body_ref,
                        is_async: func.r#async,
                        is_generator: func.generator,
                        function_scope_id: scope_id,
                        self_name: name.as_deref(),
                        is_expression_body: false,
                    };
                    let out = make_worklet_factory(
                        input, state, scoping, builder, allocator, filename, &injected,
                    );
                    ctx.record_injected_refs(out.injected_ref_names.iter().cloned());
                    *expr = out.factory_call;
                } else if let Some(body) = func.body.as_mut() {
                    process_body_with_frame(
                        &mut body.statements,
                        ctx,
                        state,
                        scoping,
                        builder,
                        allocator,
                        filename,
                    );
                }
            }
        }
        Expression::ObjectExpression(obj) => {
            process_object_expression(obj, ctx, state, scoping, builder, allocator, filename);
        }
        Expression::CallExpression(call) => {
            let effective_callee: &Expression<'_> = match &call.callee {
                Expression::SequenceExpression(seq) => seq
                    .expressions
                    .last()
                    .unwrap_or(&call.callee),
                other => other,
            };
            let callee_name = match effective_callee {
                Expression::Identifier(id) => Some(id.name.to_string()),
                Expression::StaticMemberExpression(m) => Some(m.property.name.to_string()),
                _ => None,
            };

            let is_gesture_callee = is_gesture_object_event_callback_method(effective_callee);
            let is_layout_animation_callee = is_layout_animation_callback_method(effective_callee);

            {
                if let Some(name) = callee_name.as_deref() {
                    let arg_indices: &[usize] =
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
                        };
                    for &i in arg_indices {
                        if let Some(arg) = call.arguments.get_mut(i) {
                            autoworkletize_function_arg(
                                arg, ctx, state, scoping, builder, allocator, filename,
                            );
                        }
                    }
                    if is_object_hook_at_arg0(name) {
                        if let Some(Argument::ObjectExpression(obj)) =
                            call.arguments.get_mut(0)
                        {
                            inject_worklet_directives_to_object_methods(obj, builder);
                            process_object_expression(
                                obj, ctx, state, scoping, builder, allocator, filename,
                            );
                        }
                    }
                }

                if is_gesture_callee || is_layout_animation_callee {
                    for i in 0..call.arguments.len() {
                        if let Some(arg) = call.arguments.get_mut(i) {
                            if let Argument::ObjectExpression(obj) = arg {
                                inject_worklet_directives_to_object_methods(obj, builder);
                                process_object_expression(
                                    obj, ctx, state, scoping, builder, allocator, filename,
                                );
                            } else {
                                autoworkletize_function_arg(
                                    arg, ctx, state, scoping, builder, allocator, filename,
                                );
                            }
                        }
                    }
                }
            }

            process_expression(
                &mut call.callee,
                ctx,
                state,
                scoping,
                builder,
                allocator,
                filename,
            );
            for arg in call.arguments.iter_mut() {
                if let Some(arg_expr) = arg.as_expression_mut() {
                    process_expression(
                        arg_expr, ctx, state, scoping, builder, allocator, filename,
                    );
                }
            }
        }
        Expression::StaticMemberExpression(m) => {
            process_expression(&mut m.object, ctx, state, scoping, builder, allocator, filename);
        }
        Expression::ComputedMemberExpression(m) => {
            process_expression(&mut m.object, ctx, state, scoping, builder, allocator, filename);
            process_expression(&mut m.expression, ctx, state, scoping, builder, allocator, filename);
        }
        Expression::ArrayExpression(arr) => {
            for el in arr.elements.iter_mut() {
                if let Some(e) = el.as_expression_mut() {
                    process_expression(e, ctx, state, scoping, builder, allocator, filename);
                }
            }
        }
        Expression::NewExpression(new_expr) => {
            process_expression(&mut new_expr.callee, ctx, state, scoping, builder, allocator, filename);
            for arg in new_expr.arguments.iter_mut() {
                if let Some(e) = arg.as_expression_mut() {
                    process_expression(e, ctx, state, scoping, builder, allocator, filename);
                }
            }
        }
        Expression::AssignmentExpression(assign) => {
            if let oxc_ast::ast::AssignmentTarget::AssignmentTargetIdentifier(lhs) = &assign.left {
                if let Some(rid) = lhs.reference_id.get() {
                    if let Some(sid) = scoping.get_reference(rid).symbol_id() {
                        if state.referenced_worklet_symbols.contains(&sid) {
                            match &mut assign.right {
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
                    }
                }
            }
            process_expression(&mut assign.right, ctx, state, scoping, builder, allocator, filename);
        }
        Expression::ConditionalExpression(cond) => {
            process_expression(&mut cond.test, ctx, state, scoping, builder, allocator, filename);
            process_expression(&mut cond.consequent, ctx, state, scoping, builder, allocator, filename);
            process_expression(&mut cond.alternate, ctx, state, scoping, builder, allocator, filename);
        }
        Expression::LogicalExpression(l) => {
            process_expression(&mut l.left, ctx, state, scoping, builder, allocator, filename);
            process_expression(&mut l.right, ctx, state, scoping, builder, allocator, filename);
        }
        Expression::BinaryExpression(b) => {
            process_expression(&mut b.left, ctx, state, scoping, builder, allocator, filename);
            process_expression(&mut b.right, ctx, state, scoping, builder, allocator, filename);
        }
        Expression::SequenceExpression(seq) => {
            for e in seq.expressions.iter_mut() {
                process_expression(e, ctx, state, scoping, builder, allocator, filename);
            }
        }
        Expression::AwaitExpression(a) => {
            process_expression(&mut a.argument, ctx, state, scoping, builder, allocator, filename);
        }
        Expression::YieldExpression(y) => {
            if let Some(arg) = &mut y.argument {
                process_expression(arg, ctx, state, scoping, builder, allocator, filename);
            }
        }
        Expression::UnaryExpression(u) => {
            process_expression(&mut u.argument, ctx, state, scoping, builder, allocator, filename);
        }
        Expression::ParenthesizedExpression(p) => {
            process_expression(&mut p.expression, ctx, state, scoping, builder, allocator, filename);
        }
        Expression::ChainExpression(c) => {
            if let oxc_ast::ast::ChainElement::CallExpression(call) = &mut c.expression {
                process_expression(
                    &mut call.callee, ctx, state, scoping, builder, allocator, filename,
                );
                for arg in call.arguments.iter_mut() {
                    if let Some(arg_expr) = arg.as_expression_mut() {
                        process_expression(
                            arg_expr, ctx, state, scoping, builder, allocator, filename,
                        );
                    }
                }
            }
        }
        Expression::TaggedTemplateExpression(t) => {
            process_expression(&mut t.tag, ctx, state, scoping, builder, allocator, filename);
            for e in t.quasi.expressions.iter_mut() {
                process_expression(e, ctx, state, scoping, builder, allocator, filename);
            }
        }
        _ => {}
    }
}

fn process_object_expression<'a>(
    obj: &mut ObjectExpression<'a>,
    ctx: &mut PrependCtx<'a>,
    state: &mut State,
    scoping: &Scoping,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    filename: &str,
) {
    for prop in obj.properties.iter_mut() {
        if let ObjectPropertyKind::ObjectProperty(prop) = prop {
            if prop.method {
                let method_name = match &prop.key {
                    PropertyKey::StaticIdentifier(id) => Some(id.name.to_string()),
                    _ => None,
                };
                if let Expression::FunctionExpression(func) = &mut prop.value {
                    if let Some(body) = &func.body {
                        if has_worklet_directive(body) {
                            let injected = if let Some(body_mut) = func.body.as_mut() {
                                process_body_with_frame(
                                    &mut body_mut.statements, ctx, state, scoping, builder, allocator, filename,
                                )
                            } else {
                                std::collections::HashSet::new()
                            };
                            let scope_id = func.scope_id.get().unwrap_or(scoping.root_scope_id());
                            let body_ref = func
                        .body
                        .as_ref()
                        .expect("function body presence checked above");
                            let method_name_ref = method_name.as_deref();
                            let input = WorkletInput {
                                params: &func.params,
                                body: body_ref,
                                is_async: func.r#async,
                                is_generator: func.generator,
                                function_scope_id: scope_id,
                                self_name: method_name_ref,
                                is_expression_body: false,
                            };
                            let out = make_worklet_factory(
                                input, state, scoping, builder, allocator, filename, &injected,
                            );
                            ctx.record_injected_refs(out.injected_ref_names.iter().cloned());
                            prop.value = out.factory_call;
                            prop.method = false;
                        } else if let Some(body_mut) = func.body.as_mut() {
                            process_body_with_frame(
                                &mut body_mut.statements, ctx, state, scoping, builder, allocator, filename,
                            );
                        }
                    }
                }
            } else {
                process_expression(
                    &mut prop.value, ctx, state, scoping, builder, allocator, filename,
                );
            }
        }
    }
}

fn autoworkletize_function_arg<'a>(
    arg: &mut Argument<'a>,
    ctx: &mut PrependCtx<'a>,
    state: &mut State,
    scoping: &Scoping,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    filename: &str,
) {
    let took_expr = match arg {
        Argument::ArrowFunctionExpression(arrow) => {
            inject_worklet_directive(&mut arrow.body, builder);
            true
        }
        Argument::FunctionExpression(func) => {
            if let Some(body) = &mut func.body {
                inject_worklet_directive(body, builder);
                true
            } else {
                false
            }
        }
        _ => false,
    };
    if !took_expr {
        return;
    }

    let dummy = builder.expression_null_literal(SPAN);
    let taken = std::mem::replace(arg, Argument::from(dummy));
    let mut as_expr = match taken {
        Argument::ArrowFunctionExpression(arrow) => Expression::ArrowFunctionExpression(arrow),
        Argument::FunctionExpression(func) => Expression::FunctionExpression(func),
        _ => unreachable!(),
    };
    process_expression(
        &mut as_expr, ctx, state, scoping, builder, allocator, filename,
    );
    *arg = Argument::from(as_expr);
}

fn inject_worklet_directives_to_object_methods<'a>(
    obj: &mut ObjectExpression<'a>,
    builder: AstBuilder<'a>,
) {
    for prop in obj.properties.iter_mut() {
        if let ObjectPropertyKind::ObjectProperty(p) = prop {
            match &mut p.value {
                Expression::FunctionExpression(func) => {
                    if let Some(body) = &mut func.body {
                        inject_worklet_directive(body, builder);
                    }
                }
                Expression::ArrowFunctionExpression(arrow) => {
                    inject_worklet_directive(&mut arrow.body, builder);
                }
                _ => {}
            }
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
