use std::collections::HashSet;

use oxc_allocator::Allocator;
use oxc_ast::ast::{
    ArrowFunctionExpression, Declaration, ExportDefaultDeclaration, ExportDefaultDeclarationKind,
    ExportNamedDeclaration, Expression, Function, ObjectProperty, Program, PropertyKey,
    PropertyKind, Statement,
};
use oxc_ast::AstBuilder;
use oxc_ast_visit::{walk_mut, VisitMut};
use oxc_semantic::Scoping;
use oxc_span::SPAN;
use oxc_syntax::scope::ScopeFlags;

use crate::closure::InjectedRef;
use crate::state::State;
use crate::utils::{const_decl, const_declaration, has_worklet_directive};
use crate::worklet_factory::{make_worklet_factory, FactoryContext, WorkletInput};

pub fn process_program<'a>(
    program: &mut Program<'a>,
    state: &mut State,
    scoping: &Scoping,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    filename: &str,
    type_asserted: &crate::type_assertions::TypeAssertions,
) -> Vec<(String, String)> {
    let (error, hidden_writes) = crate::referenced_worklets::add_directives_to_known_callbacks(
        program,
        scoping,
        builder,
        type_asserted,
    );
    state.error = error;
    state.hidden_writes = hidden_writes;

    {
        let mut pass = WorkletPass {
            state,
            scoping,
            builder,
            allocator,
            filename,
            assertions: type_asserted,
            injected_refs_stack: Vec::new(),
            parent_is_scopable: true,
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
    assertions: &'b crate::type_assertions::TypeAssertions,
    injected_refs_stack: Vec<HashSet<InjectedRef>>,
    parent_is_scopable: bool,
}

impl<'a, 'b> WorkletPass<'a, 'b> {
    fn record_injected_refs<I: IntoIterator<Item = InjectedRef>>(&mut self, refs: I) {
        if let Some(set) = self.injected_refs_stack.last_mut() {
            set.extend(refs);
        }
    }

    fn in_new_frame(&mut self, walk: impl FnOnce(&mut Self)) -> HashSet<InjectedRef> {
        self.injected_refs_stack.push(HashSet::new());
        walk(self);
        self.injected_refs_stack.pop().unwrap_or_default()
    }

    fn walk_function_scoped(
        &mut self,
        func: &mut Function<'a>,
        flags: ScopeFlags,
    ) -> HashSet<InjectedRef> {
        self.in_new_frame(|pass| walk_mut::walk_function(pass, func, flags))
    }

    fn walk_arrow_scoped(
        &mut self,
        arrow: &mut ArrowFunctionExpression<'a>,
    ) -> HashSet<InjectedRef> {
        self.in_new_frame(|pass| walk_mut::walk_arrow_function_expression(pass, arrow))
    }

    fn take_declaration_factory(
        &mut self,
        func: &mut Function<'a>,
    ) -> Option<(Expression<'a>, String)> {
        let previous = std::mem::replace(&mut self.parent_is_scopable, true);
        let injected = self.walk_function_scoped(func, ScopeFlags::Function);
        self.parent_is_scopable = previous;

        let name = func.id.as_ref().map(|id| id.name.to_string());
        match self.workletize_function(func, name.as_deref(), &injected) {
            Some((factory_call, react_name)) => Some((factory_call, name.unwrap_or(react_name))),
            None => {
                self.record_injected_refs(injected);
                None
            }
        }
    }

    fn binding_pattern(&self, name: &str) -> oxc_ast::ast::BindingPattern<'a> {
        self.builder
            .binding_pattern_binding_identifier(SPAN, self.builder.ident(name))
    }

    fn visit_unscopable_statement(&mut self, stmt: &mut Statement<'a>) {
        let previous = std::mem::replace(&mut self.parent_is_scopable, false);
        self.visit_statement(stmt);
        self.parent_is_scopable = previous;
    }

    fn build_factory(
        &mut self,
        input: WorkletInput<'a, '_>,
        injected: &HashSet<InjectedRef>,
    ) -> (Expression<'a>, String) {
        let out = make_worklet_factory(
            input,
            self.state,
            FactoryContext {
                scoping: self.scoping,
                builder: self.builder,
                allocator: self.allocator,
                filename: self.filename,
                assertions: self.assertions,
            },
            injected,
        );
        self.record_injected_refs(out.injected_refs.iter().cloned());
        (out.factory_call, out.react_name)
    }

    fn reject_accessor(&mut self, prop: &ObjectProperty<'a>) {
        if self.state.error.is_some() {
            return;
        }
        let kind = if prop.kind == PropertyKind::Get {
            "getter"
        } else {
            "setter"
        };
        let name = match &prop.key {
            PropertyKey::StaticIdentifier(id) => id.name.to_string(),
            _ => "<computed>".to_string(),
        };
        self.state.error = Some(format!("the `{name}` {kind} cannot be a worklet"));
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
}

impl<'a, 'b> VisitMut<'a> for WorkletPass<'a, 'b> {
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
                    function_scope_id: arrow.scope_id.get().unwrap_or(self.scoping.root_scope_id()),
                    self_name: None,
                    is_expression_body: arrow.expression,
                };
                let (factory_call, _) = self.build_factory(input, &injected);
                *expr = factory_call;
            }
            Expression::FunctionExpression(func) => {
                let injected = self.walk_function_scoped(func, ScopeFlags::Function);
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
            let previous = std::mem::replace(&mut self.parent_is_scopable, true);
            walk_mut::walk_statement(self, stmt);
            self.parent_is_scopable = previous;
            return;
        };

        let Some((factory_call, decl_name)) = self.take_declaration_factory(func) else {
            return;
        };
        if !self.parent_is_scopable {
            *stmt = self.builder.statement_expression(SPAN, factory_call);
            return;
        }
        *stmt = const_decl(self.builder, self.binding_pattern(&decl_name), factory_call);
    }

    fn visit_if_statement(&mut self, stmt: &mut oxc_ast::ast::IfStatement<'a>) {
        self.visit_expression(&mut stmt.test);
        self.visit_unscopable_statement(&mut stmt.consequent);
        if let Some(alternate) = stmt.alternate.as_mut() {
            self.visit_unscopable_statement(alternate);
        }
    }

    fn visit_labeled_statement(&mut self, stmt: &mut oxc_ast::ast::LabeledStatement<'a>) {
        self.visit_unscopable_statement(&mut stmt.body);
    }

    fn visit_switch_case(&mut self, case: &mut oxc_ast::ast::SwitchCase<'a>) {
        if let Some(test) = case.test.as_mut() {
            self.visit_expression(test);
        }
        for stmt in case.consequent.iter_mut() {
            self.visit_unscopable_statement(stmt);
        }
    }

    fn visit_export_default_declaration(&mut self, decl: &mut ExportDefaultDeclaration<'a>) {
        let ExportDefaultDeclarationKind::FunctionDeclaration(func) = &mut decl.declaration else {
            walk_mut::walk_export_default_declaration(self, decl);
            return;
        };

        if let Some((factory_call, _)) = self.take_declaration_factory(func) {
            decl.declaration = ExportDefaultDeclarationKind::from(factory_call);
        }
    }

    fn visit_export_named_declaration(&mut self, decl: &mut ExportNamedDeclaration<'a>) {
        let Some(Declaration::FunctionDeclaration(func)) = &mut decl.declaration else {
            walk_mut::walk_export_named_declaration(self, decl);
            return;
        };

        let Some((factory_call, decl_name)) = self.take_declaration_factory(func) else {
            return;
        };
        decl.declaration = Some(Declaration::VariableDeclaration(const_declaration(
            self.builder,
            self.binding_pattern(&decl_name),
            factory_call,
        )));
    }

    fn visit_object_property(&mut self, prop: &mut ObjectProperty<'a>) {
        let is_accessor = prop.kind != PropertyKind::Init;
        if !prop.method && !is_accessor {
            walk_mut::walk_object_property(self, prop);
            return;
        }
        let Expression::FunctionExpression(_) = &prop.value else {
            walk_mut::walk_object_property(self, prop);
            return;
        };

        // An accessor can't be rewritten into a data property without losing
        // its get/set semantics, so refuse it the way the Babel plugin does.
        if is_accessor {
            if is_worklet_accessor(prop) {
                self.reject_accessor(prop);
            } else {
                walk_mut::walk_object_property(self, prop);
            }
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
            return;
        };
        let injected = self.walk_function_scoped(func, ScopeFlags::Function);
        if let Some((factory_call, _)) =
            self.workletize_function(func, method_name.as_deref(), &injected)
        {
            prop.value = factory_call;
            prop.method = false;
        } else {
            self.record_injected_refs(injected);
        }
    }
}

fn is_worklet_accessor(prop: &ObjectProperty<'_>) -> bool {
    let Expression::FunctionExpression(func) = &prop.value else {
        return false;
    };
    func.body
        .as_ref()
        .is_some_and(|body| has_worklet_directive(body))
}
