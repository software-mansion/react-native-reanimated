use oxc_allocator::Allocator;
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{
    Argument, Declaration, Expression, FunctionBody, ObjectExpression, ObjectPropertyKind,
    Program, PropertyKey, Statement, VariableDeclarationKind, VariableDeclarator,
};
use oxc_semantic::Scoping;
use oxc_span::SPAN;

use crate::auto_detect::{
    GESTURE_HANDLER_OBJECT_HOOKS, is_gesture_object_event_callback_method,
    is_layout_animation_callback_method,
};
use crate::context_object::process_context_object;
use crate::state::State;
use crate::worklet_factory::{FactoryOutput, WorkletInput, make_worklet_factory};

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

/// Hooks where indices 0+1 are both worklet callbacks (`useAnimatedReaction(state, callback)`).
const FUNCTION_HOOKS_ARG01: &[&str] = &["useAnimatedReaction"];

/// Hooks whose worklet callback is at index 1 (`withDecay(config, callback)`).
const FUNCTION_HOOKS_ARG1: &[&str] = &["withDecay"];

/// Hooks whose worklet callback is at index 2 (`withTiming(value, config, callback)`).
const FUNCTION_HOOKS_ARG2: &[&str] = &["withTiming", "withSpring"];

/// Hooks whose worklet callback is at index 3 (`withRepeat(animation, n, reverse, callback)`).
const FUNCTION_HOOKS_ARG3: &[&str] = &["withRepeat"];

const OBJECT_HOOKS_ARG0: &[&str] = &["useAnimatedScrollHandler"];

/// Tracks pending statements to prepend at two scopes:
///   * `top` — file top level (default destination for init-data declarations)
///   * `function_stack` — a stack of function-body frames; `local()` returns
///     the topmost frame, falling back to `top` when none is open. Worklets
///     marked `'limit-init-data-hoisting'` route their init-data here so it
///     lands in the parent function's body, keeping the identifier in
///     lexical scope when that body is serialized as a worklet string.
pub struct PrependCtx<'a> {
    pub top: Vec<Statement<'a>>,
    function_stack: Vec<Vec<Statement<'a>>>,
    /// Per-frame sets of identifier names that were *synthesized* into the
    /// current function body by inner-first workletization (the param packs
    /// of inner factory calls). They lack a `reference_id` so the outer
    /// worklet's closure analysis can't resolve them via `oxc_semantic` —
    /// we force-capture them as closure vars instead. Mirrors babel's
    /// `path.scope.crawl()` after each mutation.
    pub injected_refs_stack: Vec<std::collections::HashSet<String>>,
}

impl<'a> PrependCtx<'a> {
    pub fn new() -> Self {
        Self {
            top: Vec::new(),
            function_stack: Vec::new(),
            injected_refs_stack: Vec::new(),
        }
    }

    pub fn top(&mut self) -> &mut Vec<Statement<'a>> { &mut self.top }

    pub fn local(&mut self) -> &mut Vec<Statement<'a>> {
        if let Some(last) = self.function_stack.last_mut() {
            last
        } else {
            &mut self.top
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

    /// Register names that we just wrote into the current frame's body
    /// (e.g. closure vars passed to an inner factory call).
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
    let old_body = std::mem::replace(&mut program.body, builder.vec());
    let mut new_body = builder.vec_with_capacity(old_body.len());

    for stmt in old_body {
        let mut ctx = PrependCtx::new();
        let processed = process_top_level_statement(
            stmt, &mut ctx, state, scoping, builder, allocator, filename,
        );
        for p in ctx.top {
            new_body.push(p);
        }
        new_body.push(processed);
    }

    program.body = new_body;
    std::mem::take(&mut state.emitted_files)
}

/// Drop `init_data_decl` into the right bucket: file-top-level by default,
/// or the parent function-body frame when the worklet was marked
/// `'limit-init-data-hoisting'`.
fn route_init_data<'a>(
    ctx: &mut PrependCtx<'a>,
    out: &FactoryOutput<'a>,
    init: Option<Statement<'a>>,
) {
    let Some(stmt) = init else { return };
    if out.limit_init_data_hoisting {
        ctx.local().push(stmt);
    } else {
        ctx.top().push(stmt);
    }
}

/// Process a function/method body inside a fresh local-prepend frame, then
/// prepend anything routed to that frame (via `'limit-init-data-hoisting'`)
/// to the start of the body. Returns the set of identifier names that
/// inner-first workletizations *injected* into the body (param packs of
/// inner factory calls) so the caller can hand it to `make_worklet_factory`
/// as the `force_capture` set when this body is itself a worklet.
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
            // Only handle named, marked, top-level classes.
            let is_worklet =
                crate::worklet_class::is_worklet_class(&class)
                    && class.id.is_some()
                    && !state.opts.disable_worklet_classes.unwrap_or(false)
                    && !state.opts.bundle_mode.unwrap_or(false);
            if is_worklet {
                let class_name = class.id.as_ref().unwrap().name.to_string();
                if let Some((factory_decl, const_decl)) =
                    crate::worklet_class::build_class_factory_pair(
                        &mut class,
                        &class_name,
                        builder,
                        allocator,
                    )
                {
                    ctx.top().push(factory_decl);
                    return const_decl;
                }
            }
            // Not a worklet class — but still recurse into method/property
            // bodies so nested worklets (e.g. `build = () => { 'worklet'; … }`
            // on a layout-animation class) get workletized.
            process_class_body(
                &mut class.body, ctx, state, scoping, builder, allocator, filename,
            );
            Statement::ClassDeclaration(class)
        }
        Statement::FunctionDeclaration(mut func) => {
            if let Some(body) = &func.body {
                if has_worklet_directive(body) {
                    // Inner-first inside a fresh local-prepend frame: nested
                    // worklets marked `'limit-init-data-hoisting'` get their
                    // init-data injected at the top of *this* body, which is
                    // the body we're about to stringify. We also capture the
                    // set of identifier names those inner factory calls now
                    // reference, so our closure analysis can force-capture
                    // them (they have no `reference_id`).
                    let injected = if let Some(body_mut) = func.body.as_mut() {
                        state.inside_worklet_depth += 1;
                        let r = process_body_with_frame(
                            &mut body_mut.statements, ctx, state, scoping, builder, allocator, filename,
                        );
                        state.inside_worklet_depth -= 1;
                        r
                    } else {
                        std::collections::HashSet::new()
                    };
                    let name = func.id.as_ref().map(|id| id.name.to_string());
                    let scope_id = func.scope_id.get().unwrap_or(scoping.root_scope_id());
                    let body_ref = func.body.as_ref().unwrap();
                    let input = WorkletInput {
                        params: &func.params,
                        body: body_ref,
                        is_async: func.r#async,
                        is_generator: func.generator,
                        function_scope_id: scope_id,
                        self_name: name.as_deref(),
                        is_expression_body: false,
                    };
                    let mut out = make_worklet_factory(
                        input, state, scoping, builder, allocator, filename, &injected,
                    );
                    // Tell the grandparent frame about names *we* now inject.
                    ctx.record_injected_refs(out.injected_ref_names.iter().cloned());
                    let init = out.init_data_decl.take();
                    route_init_data(ctx, &out, init);
                    let decl_name = name.unwrap_or_else(|| out.react_name.clone());
                    return build_const_decl(builder, &decl_name, out.factory_call);
                }
            }
            // Not a worklet — but recurse into its body for nested worklets / autoworkletization.
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
                    if let Some(body) = func.body.as_mut() {
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
                    // `export default <expression>` — fall through to the
                    // generic expression walker.
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
            // `export function foo() { 'worklet'; ... }` needs to become
            // `export const foo = factoryCall(...)` after workletization. We
            // build the inner factory + replace the export's `.declaration`
            // with a fresh VariableDeclaration. Init-data goes into the
            // shared `prepend` list (bubbles to top-level via process_program).
            if let Some(Declaration::FunctionDeclaration(func)) = &mut decl.declaration {
                if let Some(body) = &func.body {
                    if has_worklet_directive(body) {
                        // Inner-first recursion in a fresh frame.
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
                        let body_ref = func.body.as_ref().unwrap();
                        let input = WorkletInput {
                            params: &func.params,
                            body: body_ref,
                            is_async: func.r#async,
                            is_generator: func.generator,
                            function_scope_id: scope_id,
                            self_name: if name.is_empty() { None } else { Some(&name) },
                            is_expression_body: false,
                        };
                        let mut out = make_worklet_factory(
                            input, state, scoping, builder, allocator, filename, &injected,
                        );
                        ctx.record_injected_refs(out.injected_ref_names.iter().cloned());
                        let init = out.init_data_decl.take();
                        route_init_data(ctx, &out, init);
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

/// Recurse into each method body and property initializer of a class so
/// nested worklets / autoworkletizable calls inside class members get found.
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

/// Take ownership of a single `Statement` slot, run it through
/// `process_top_level_statement`, and write the result back in place. Used
/// by control-flow handlers (if / while / for / …) which hold one inner
/// statement rather than a `Vec<Statement>`.
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
            // The function itself isn't a worklet (the worklet-directive case
            // is handled at the ExportNamedDeclaration level); recurse into
            // its body to catch worklets / autoworkletizable hook calls
            // nested inside it (e.g. `runOnUISync(() => { 'worklet'; … })`
            // inside an exported plain function).
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
                // Process nested worklets first inside a fresh local frame so
                // `'limit-init-data-hoisting'` items land in this arrow's body.
                state.inside_worklet_depth += 1;
                let injected = process_body_with_frame(
                    &mut arrow.body.statements,
                    ctx,
                    state,
                    scoping,
                    builder,
                    allocator,
                    filename,
                );
                state.inside_worklet_depth -= 1;
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
                let mut out = make_worklet_factory(
                    input, state, scoping, builder, allocator, filename, &injected,
                );
                ctx.record_injected_refs(out.injected_ref_names.iter().cloned());
                let init = out.init_data_decl.take();
                route_init_data(ctx, &out, init);
                *expr = out.factory_call;
            } else {
                // Recurse so we still catch nested worklets / autoworkletizable
                // calls inside non-worklet arrow bodies, e.g.
                // `() => scheduleOnUI(() => { 'worklet'; ... })`.
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
                    // Inner-first ordering (see ArrowFunctionExpression branch).
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
                    let body_ref = func.body.as_ref().unwrap();
                    let input = WorkletInput {
                        params: &func.params,
                        body: body_ref,
                        is_async: func.r#async,
                        is_generator: func.generator,
                        function_scope_id: scope_id,
                        self_name: name.as_deref(),
                        is_expression_body: false,
                    };
                    let mut out = make_worklet_factory(
                        input, state, scoping, builder, allocator, filename, &injected,
                    );
                    ctx.record_injected_refs(out.injected_ref_names.iter().cloned());
                    let init = out.init_data_decl.take();
                    route_init_data(ctx, &out, init);
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
            // Try the context-object conversion first (it injects a factory method
            // that itself contains the 'worklet' directive — we still need to
            // workletize that method afterwards).
            // Context-object conversion: only act when the object is
            // *explicitly* marked. Babel's plugin only does implicit
            // detection (`this`-using methods) for files with the file-level
            // `'worklet'` directive — outside that, regular object literals
            // that happen to use `this` (like the FrameCallback registry)
            // must be left alone.
            process_context_object(obj, builder, allocator);
            process_object_expression(obj, ctx, state, scoping, builder, allocator, filename);
        }
        Expression::CallExpression(call) => {
            let callee_name = match &call.callee {
                Expression::Identifier(id) => Some(id.name.to_string()),
                Expression::StaticMemberExpression(m) => Some(m.property.name.to_string()),
                _ => None,
            };

            // Gesture handler & layout animation callee patterns workletize all args.
            let is_gesture_callee = is_gesture_object_event_callback_method(&call.callee);
            let is_layout_animation_callee = is_layout_animation_callback_method(&call.callee);

            // We always autoworkletize, even inside an enclosing worklet's
            // body. Reason: a method like `close() { 'worklet'; if (_WORKLET)
            // { ... } runOnUI(() => { ... })(); }` is callable from both JS
            // and worklet runtimes — on the JS side the inner arrow must be
            // a worklet or `runOnUI`'s validation throws.
            //
            // (Babel achieves this via a separate re-traversal after factory
            // substitution. We achieve it by never suppressing the recursive
            // visit.)
            let allow_auto = true;
            let _ = state.inside_worklet_depth;

            if allow_auto {
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
                    if OBJECT_HOOKS_ARG0.contains(&name) {
                        if let Some(arg0) = call.arguments.get_mut(0) {
                            if let Argument::ObjectExpression(obj) = arg0 {
                                inject_worklet_directives_to_object_methods(obj, builder);
                                process_object_expression(
                                    obj, ctx, state, scoping, builder, allocator, filename,
                                );
                            }
                        }
                    }
                }

                if is_gesture_callee || is_layout_animation_callee {
                    for i in 0..call.arguments.len() {
                        if let Some(arg) = call.arguments.get_mut(i) {
                            autoworkletize_function_arg(
                                arg, ctx, state, scoping, builder, allocator, filename,
                            );
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
                // Snapshot the key before grabbing `&mut prop.value` so the
                // borrow checker doesn't object.
                let method_name = match &prop.key {
                    PropertyKey::StaticIdentifier(id) => Some(id.name.to_string()),
                    _ => None,
                };
                if let Expression::FunctionExpression(func) = &mut prop.value {
                    if let Some(body) = &func.body {
                        if has_worklet_directive(body) {
                            // Inner-first ordering.
                            let injected = if let Some(body_mut) = func.body.as_mut() {
                                process_body_with_frame(
                                    &mut body_mut.statements, ctx, state, scoping, builder, allocator, filename,
                                )
                            } else {
                                std::collections::HashSet::new()
                            };
                            let scope_id = func.scope_id.get().unwrap_or(scoping.root_scope_id());
                            let body_ref = func.body.as_ref().unwrap();
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
                            let mut out = make_worklet_factory(
                                input, state, scoping, builder, allocator, filename, &injected,
                            );
                            ctx.record_injected_refs(out.injected_ref_names.iter().cloned());
                            let init = out.init_data_decl.take();
                            route_init_data(ctx, &out, init);
                            prop.value = out.factory_call;
                            prop.method = false;
                        } else if let Some(body_mut) = func.body.as_mut() {
                            // Method shorthand without 'worklet' — recurse so
                            // nested worklets / autoworkletizable calls in its
                            // body still get processed.
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

fn inject_worklet_directive<'a>(body: &mut FunctionBody<'a>, builder: AstBuilder<'a>) {
    if has_worklet_directive(body) {
        return;
    }
    let dir_str = builder.str("worklet");
    let directive = builder.directive(
        SPAN,
        builder.string_literal(SPAN, dir_str, None),
        dir_str,
    );
    let mut directives = builder.vec_with_capacity(body.directives.len() + 1);
    directives.push(directive);
    for d in body.directives.drain(..) {
        directives.push(d);
    }
    body.directives = directives;
}

fn inject_worklet_directives_to_object_methods<'a>(
    obj: &mut ObjectExpression<'a>,
    builder: AstBuilder<'a>,
) {
    for prop in obj.properties.iter_mut() {
        if let ObjectPropertyKind::ObjectProperty(p) = prop {
            if p.method {
                if let Expression::FunctionExpression(func) = &mut p.value {
                    if let Some(body) = &mut func.body {
                        inject_worklet_directive(body, builder);
                    }
                }
            }
        }
    }
}

fn has_worklet_directive(body: &FunctionBody<'_>) -> bool {
    body.directives
        .iter()
        .any(|d| d.directive.as_str() == "worklet")
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
