use oxc_allocator::Allocator;
use oxc_ast::AstBuilder;
use oxc_ast::ast::{
    ArrowFunctionExpression, ClassElement, Declaration, ExportDefaultDeclaration,
    ExportDefaultDeclarationKind, ExportNamedDeclaration, Expression, Function, ObjectProperty,
    PropertyKey, PropertyKind, Statement,
};
use oxc_ast_visit::{VisitMut, walk_mut};
use oxc_semantic::Scoping;
use oxc_span::SPAN;
use oxc_syntax::scope::ScopeFlags;

use crate::ast::{const_decl, const_declaration, identifier_binding_pattern};
use crate::class_method::{MethodOutcome, process_if_worklet_method};
use crate::directives::has_worklet_directive;
use crate::types::State;
use crate::worklet_factory::{FactoryContext, WorkletInput, make_worklet_factory};

pub struct WorkletPass<'a, 'b> {
    pub state: &'b mut State,
    scoping: &'b mut Scoping,
    pub builder: AstBuilder<'a>,
    pub allocator: &'a Allocator,
    filename: &'b str,
    parent_is_scopable: bool,
}

impl<'a, 'b> VisitMut<'a> for WorkletPass<'a, 'b> {
    fn visit_expression(&mut self, expr: &mut Expression<'a>) {
        match expr {
            Expression::ArrowFunctionExpression(arrow) => {
                walk_mut::walk_arrow_function_expression(self, arrow);
                if let Some(factory_call) = self.try_workletize_arrow(arrow) {
                    *expr = factory_call;
                }
            }
            Expression::FunctionExpression(func) => {
                walk_mut::walk_function(self, func, ScopeFlags::Function);
                let name = func.name().map(|name| name.as_str());
                if let Some((factory_call, _)) = self.try_workletize_function(func, name, true) {
                    *expr = factory_call;
                }
            }
            _ => walk_mut::walk_expression(self, expr),
        }
    }

    fn visit_statements(&mut self, statements: &mut oxc_allocator::Vec<'a, Statement<'a>>) {
        let previous = std::mem::replace(&mut self.parent_is_scopable, true);
        walk_mut::walk_statements(self, statements);
        self.parent_is_scopable = previous;
    }

    /**
     * Replaces the node with a factory call while making sure that it's a legal
     * operation. If the node cannot be simply replaced with a factory call, it
     * will be replaced with a variable declaration.
     *
     * For example:
     *
     * ```js
     * export function foo() {
     *   'worklet';
     *   return 1;
     * }
     * ```
     *
     * Becomes
     *
     * ```js
     * export const foo = factoryCall();
     * ```
     *
     * But a declaration in a position that takes no declarations, like
     * `if (x) function foo() { 'worklet'; }`, becomes a bare factory call.
     */
    fn visit_statement(&mut self, stmt: &mut Statement<'a>) {
        let Statement::FunctionDeclaration(func) = stmt else {
            let previous = std::mem::replace(&mut self.parent_is_scopable, false);
            walk_mut::walk_statement(self, stmt);
            self.parent_is_scopable = previous;
            return;
        };

        walk_mut::walk_function(self, func, ScopeFlags::Function);
        let Some((factory_call, decl_name)) = self.try_workletize_declaration(func) else {
            return;
        };
        if !self.parent_is_scopable {
            *stmt = self.builder.statement_expression(SPAN, factory_call);
            return;
        }
        *stmt = const_decl(
            self.builder,
            identifier_binding_pattern(self.builder, &decl_name),
            factory_call,
        );
    }

    fn visit_export_default_declaration(&mut self, decl: &mut ExportDefaultDeclaration<'a>) {
        let ExportDefaultDeclarationKind::FunctionDeclaration(func) = &mut decl.declaration else {
            walk_mut::walk_export_default_declaration(self, decl);
            return;
        };

        walk_mut::walk_function(self, func, ScopeFlags::Function);
        if let Some((factory_call, _)) = self.try_workletize_declaration(func) {
            decl.declaration = ExportDefaultDeclarationKind::from(factory_call);
        }
    }

    fn visit_export_named_declaration(&mut self, decl: &mut ExportNamedDeclaration<'a>) {
        let Some(Declaration::FunctionDeclaration(func)) = &mut decl.declaration else {
            walk_mut::walk_export_named_declaration(self, decl);
            return;
        };

        walk_mut::walk_function(self, func, ScopeFlags::Function);
        let Some((factory_call, decl_name)) = self.try_workletize_declaration(func) else {
            return;
        };
        decl.declaration = Some(Declaration::VariableDeclaration(const_declaration(
            self.builder,
            identifier_binding_pattern(self.builder, &decl_name),
            factory_call,
        )));
    }

    fn visit_class_body(&mut self, body: &mut oxc_ast::ast::ClassBody<'a>) {
        for element in body.body.iter_mut() {
            let ClassElement::MethodDefinition(method) = element else {
                self.visit_class_element(element);
                continue;
            };
            match process_if_worklet_method(self, method) {
                MethodOutcome::NotAWorklet => self.visit_class_element(element),
                MethodOutcome::Workletized(property) => *element = property,
            }
        }
    }

    /**
     * Workletizes object methods, rejects worklet accessors
     * and walks the property node
     */
    fn visit_object_property(&mut self, prop: &mut ObjectProperty<'a>) {
        let is_accessor = prop.kind.is_accessor();
        let is_method_like = prop.method || is_accessor;
        if !is_method_like {
            walk_mut::walk_object_property(self, prop);
            return;
        }

        if is_accessor {
            if is_worklet_accessor(prop) {
                self.reject_accessor(prop);
            } else {
                walk_mut::walk_object_property(self, prop);
            }
            return;
        }

        let method_name = match &prop.key {
            PropertyKey::StaticIdentifier(id) => Some(id.name.as_str()),
            _ => None,
        };
        if prop.computed {
            self.visit_property_key(&mut prop.key);
        }
        let Expression::FunctionExpression(func) = &mut prop.value else {
            return;
        };
        walk_mut::walk_function(self, func, ScopeFlags::Function);
        if let Some((factory_call, _)) = self.try_workletize_function(func, method_name, false) {
            prop.value = factory_call;
            prop.method = false;
        }
    }
}

impl<'a, 'b> WorkletPass<'a, 'b> {
    pub fn new(
        state: &'b mut State,
        scoping: &'b mut Scoping,
        builder: AstBuilder<'a>,
        allocator: &'a Allocator,
        filename: &'b str,
    ) -> Self {
        Self {
            state,
            scoping,
            builder,
            allocator,
            filename,
            parent_is_scopable: true,
        }
    }

    fn try_workletize_declaration(
        &mut self,
        func: &Function<'a>,
    ) -> Option<(Expression<'a>, String)> {
        let name = func.name().map(|name| name.as_str());
        let (factory_call, react_name) = self.try_workletize_function(func, name, true)?;
        Some((factory_call, name.map(str::to_string).unwrap_or(react_name)))
    }

    fn build_factory(&mut self, input: WorkletInput<'a, '_>) -> (Expression<'a>, String) {
        let out = make_worklet_factory(
            input,
            self.state,
            self.scoping,
            FactoryContext {
                builder: self.builder,
                allocator: self.allocator,
                filename: self.filename,
            },
        );
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
            PropertyKey::StaticIdentifier(id) => id.name.as_str(),
            _ => "<computed>",
        };
        self.state.error = Some(format!("the `{name}` {kind} cannot be a worklet"));
    }

    fn try_workletize_arrow(
        &mut self,
        arrow: &ArrowFunctionExpression<'a>,
    ) -> Option<Expression<'a>> {
        if !has_worklet_directive(&arrow.body) {
            return None;
        }
        let input = WorkletInput {
            params: &arrow.params,
            body: &arrow.body,
            is_async: arrow.r#async,
            is_generator: false,
            function_scope_id: arrow.scope_id.get().unwrap_or(self.scoping.root_scope_id()),
            self_name: None,
            self_name_binds: false,
            is_expression_body: arrow.expression,
        };
        Some(self.build_factory(input).0)
    }

    pub fn try_workletize_function(
        &mut self,
        func: &Function<'a>,
        self_name: Option<&str>,
        self_name_binds: bool,
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
            self_name_binds,
            is_expression_body: false,
        };
        Some(self.build_factory(input))
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
