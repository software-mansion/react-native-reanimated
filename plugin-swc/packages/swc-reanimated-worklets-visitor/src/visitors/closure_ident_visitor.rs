use std::{collections::HashSet, cell::RefCell};
use swc_common::Mark;
use swc_ecmascript::{
  ast::*,
  visit::{Visit, VisitWith},
};

use crate::utils::{IdentType, Scope, ScopeKind, VarType, VarInfo, IdentPath, ClosureGenerator};

pub struct ClosureIdentVisitor<'a> {
  outputs: HashSet<Ident>,
  is_parent_member_expr: bool,
  is_member_expr_computed: bool,
  is_in_object_expression: bool,
  is_in_object_prop: bool,
  parent_member_expr_prop_ident: Option<Ident>,
  parent_object_prop_ident: Option<Ident>,
  ident_type: Option<IdentType>,
  var_decl_kind: Option<VarDeclKind>,
  ident_path: Option<IdentPath>,
  scope: Scope<'a>,
  in_type: bool,
  globals: &'a Vec<String>,
  fn_name: &'a Option<Ident>,
  closure_generator: ClosureGenerator,
}

impl<'a> ClosureIdentVisitor<'a> {
  pub fn new(current: Scope<'a>, globals: &'a Vec<String>, fn_name: &'a Option<Ident>) -> Self {
      ClosureIdentVisitor {
          outputs: Default::default(),
          is_parent_member_expr: false,
          is_member_expr_computed: false,
          is_in_object_expression: false,
          is_in_object_prop: false,
          parent_member_expr_prop_ident: Default::default(),
          parent_object_prop_ident: Default::default(),
          scope: current,
          ident_type: None,
          var_decl_kind: None,
          ident_path: None,
          in_type: false,
          globals,
          fn_name,
          closure_generator: ClosureGenerator::new(),
      }
  }

  pub fn from(value: &ClosureIdentVisitor<'a>, current: Scope<'a>) -> Self {
      ClosureIdentVisitor {
          outputs: value.outputs.clone(),
          is_parent_member_expr: value.is_parent_member_expr,
          is_member_expr_computed: value.is_member_expr_computed,
          is_in_object_expression: value.is_in_object_expression,
          is_in_object_prop: value.is_in_object_prop,
          parent_member_expr_prop_ident: value.parent_member_expr_prop_ident.clone(),
          parent_object_prop_ident: value.parent_object_prop_ident.clone(),
          scope: current,
          ident_type: value.ident_type.clone(),
          var_decl_kind: value.var_decl_kind.clone(),
          ident_path: None,
          in_type: false,
          globals: value.globals,
          fn_name: value.fn_name,
          closure_generator: ClosureGenerator::new(),
      }
  }

  pub fn take_generator(&mut self) -> ClosureGenerator {
      std::mem::replace(&mut self.closure_generator, ClosureGenerator::new())
  }

  fn visit_stmt_within_child_scope(&mut self, s: &Stmt) {
      let child_mark = Mark::fresh(Mark::root());
      let mut child = ClosureIdentVisitor::from(
          self,
          Scope::new(ScopeKind::Block, child_mark, Some(&self.scope)),
      );

      child.visit_stmt_within_same_scope(s)
  }

  fn visit_stmt_within_same_scope(&mut self, s: &Stmt) {
      match s {
          Stmt::Block(s) => {
              s.visit_children_with(self);
          }
          _ => s.visit_with(self),
      }
  }

  fn visit_with_child<T>(&mut self, kind: ScopeKind, child_mark: Mark, node: &T)
  where
      T: 'static + for<'any> VisitWith<ClosureIdentVisitor<'any>>,
  {
      self.with_child(kind, child_mark, |child| {
          node.visit_children_with(child);
      });
  }

  fn with_child<F>(&mut self, kind: ScopeKind, child_mark: Mark, op: F)
  where
      F: for<'any> FnOnce(&mut ClosureIdentVisitor<'any>),
  {
      let bindings = {
          let mut child =
              ClosureIdentVisitor::from(self, Scope::new(kind, child_mark, Some(&self.scope)));

          op(&mut child);

          self.closure_generator.merge(child.closure_generator);

          child.scope.bindings
      };

      if !matches!(kind, ScopeKind::Fn { .. }) {
          let v = bindings;

          for (id, v) in v.into_iter().filter_map(|(id, v)| {
              if v.kind == VarType::Var(VarDeclKind::Var) {
                  Some((id, v))
              } else {
                  None
              }
          }) {
              let v: VarInfo = v;

              *v.value.borrow_mut() = None;
              self.scope.bindings.insert(id, v);
          }
      }
  }

  fn add_to_path(&mut self, ident: Ident) {
    if let Some(path) = &mut self.ident_path {
        path.add(ident.clone());
    } else {
        self.ident_path = Some(IdentPath::new(ident.clone()));
    }
  }
}

impl<'a> Visit for ClosureIdentVisitor<'a> {
  fn visit_member_expr(&mut self, member_expr: &MemberExpr) {
      let mut old_parent_member_expr_prop_ident = None;
      let old_computed = self.is_member_expr_computed;
      let old = self.is_parent_member_expr;
      if let MemberProp::Computed(..) = member_expr.prop {
          self.is_member_expr_computed = true;
      }

      if let MemberProp::Ident(ident) = &member_expr.prop {
          old_parent_member_expr_prop_ident = self.parent_member_expr_prop_ident.take();
          self.parent_member_expr_prop_ident = Some(ident.clone())
      }

      self.is_parent_member_expr = true;

      member_expr.prop.visit_with(self);
      self.is_member_expr_computed = old_computed;
      member_expr.obj.visit_with(self);

      self.parent_member_expr_prop_ident = old_parent_member_expr_prop_ident;
      self.is_parent_member_expr = old;
  }

  fn visit_arrow_expr(&mut self, arrow_expr: &ArrowExpr) {
      let child_mark = Mark::fresh(Mark::root());

      self.with_child(ScopeKind::Fn, child_mark, |folder| {
          let old = folder.ident_type;
          folder.ident_type = Some(IdentType::Binding);
          arrow_expr.params.visit_with(folder);
          folder.ident_type = old;

          {
              match &arrow_expr.body {
                  BlockStmtOrExpr::BlockStmt(s) => s.stmts.visit_with(folder),
                  BlockStmtOrExpr::Expr(e) => e.visit_with(folder),
              }
          }

          arrow_expr.return_type.visit_with(folder);
      });
  }

  fn visit_binding_ident(&mut self, i: &BindingIdent) {
      let ident_type = self.ident_type;
      let in_type = self.in_type;

      self.ident_type = Some(IdentType::Ref);
      i.type_ann.visit_with(self);

      self.ident_type = ident_type;
      i.id.visit_with(self);

      self.in_type = in_type;
      self.ident_type = ident_type;
  }

  fn visit_block_stmt(&mut self, block: &BlockStmt) {
      let child_mark = Mark::fresh(Mark::root());
      self.visit_with_child(ScopeKind::Block, child_mark, block);
  }

  fn visit_catch_clause(&mut self, c: &CatchClause) {
      let child_mark = Mark::fresh(Mark::root());

      // Child folder
      self.with_child(ScopeKind::Fn, child_mark, |folder| {
          folder.ident_type = Some(IdentType::Binding);
          c.param.visit_with(folder);
          folder.ident_type = Some(IdentType::Ref);

          c.body.visit_children_with(folder);
      });
  }

  fn visit_class_decl(&mut self, n: &ClassDecl) {
      n.class.decorators.visit_with(self);

      // Create a child scope. The class name is only accessible within the class.
      let child_mark = Mark::fresh(Mark::root());

      self.with_child(ScopeKind::Fn, child_mark, |folder| {
          folder.ident_type = Some(IdentType::Ref);

          n.class.visit_with(folder);
      });
  }

  fn visit_class_expr(&mut self, n: &ClassExpr) {
      // Create a child scope. The class name is only accessible within the class.
      let child_mark = Mark::fresh(Mark::root());

      self.with_child(ScopeKind::Fn, child_mark, |folder| {
          folder.ident_type = Some(IdentType::Binding);
          n.ident.visit_with(folder);
          folder.ident_type = Some(IdentType::Ref);

          n.class.visit_with(folder);
      });
  }

  fn visit_class_method(&mut self, m: &ClassMethod) {
      m.key.visit_with(self);

      for p in m.function.params.iter() {
          p.decorators.visit_with(self);
      }

      {
          let child_mark = Mark::fresh(Mark::root());

          self.with_child(ScopeKind::Fn, child_mark, |child| {
              m.function.visit_with(child);
          });
      }
  }

  fn visit_constructor(&mut self, c: &Constructor) {
      let child_mark = Mark::fresh(Mark::root());

      for p in c.params.iter() {
          match p {
              ParamOrTsParamProp::TsParamProp(p) => {
                  p.decorators.visit_with(self);
              }
              ParamOrTsParamProp::Param(p) => {
                  p.decorators.visit_with(self);
              }
          }
      }

      {
          let old = self.ident_type;
          self.ident_type = Some(IdentType::Binding);
          self.with_child(ScopeKind::Fn, child_mark, |folder| {
              c.params.visit_with(folder);
          });
          self.ident_type = old;

          self.with_child(ScopeKind::Fn, child_mark, |folder| match &c.body {
              Some(body) => {
                  body.visit_children_with(folder);
              }
              None => {}
          });
      }
  }

  fn visit_export_default_decl(&mut self, e: &ExportDefaultDecl) {
      // Treat default exported functions and classes as declarations
      // even though they are parsed as expressions.
      match &e.decl {
          DefaultDecl::Fn(f) => {
              if f.ident.is_some() {
                  let child_mark = Mark::fresh(Mark::root());

                  self.with_child(ScopeKind::Fn, child_mark, |folder| {
                      f.function.visit_with(folder)
                  })
              } else {
                  f.visit_with(self)
              }
          }
          DefaultDecl::Class(c) => {
              // Skip class expression visitor to treat as a declaration.
              c.class.visit_with(self)
          }
          _ => e.visit_children_with(self),
      }
  }

  fn visit_expr(&mut self, expr: &Expr) {
      let old = self.ident_type;
      self.ident_type = Some(IdentType::Ref);
      expr.visit_children_with(self);
      self.ident_type = old;
  }

  fn visit_fn_decl(&mut self, node: &FnDecl) {
      // We don't fold this as Hoister handles this.

      node.function.decorators.visit_with(self);

      {
          let child_mark = Mark::fresh(Mark::root());
          self.with_child(ScopeKind::Fn, child_mark, |folder| {
              node.function.visit_with(folder);
          });
      }
  }

  fn visit_fn_expr(&mut self, e: &FnExpr) {
      e.function.decorators.visit_with(self);

      let child_mark = Mark::fresh(Mark::root());
      self.with_child(ScopeKind::Fn, child_mark, |folder| {
          e.function.visit_with(folder);
      });
  }

  fn visit_for_in_stmt(&mut self, n: &ForInStmt) {
      let child_mark = Mark::fresh(Mark::root());

      self.with_child(ScopeKind::Block, child_mark, |child| {
          n.left.visit_with(child);
          n.right.visit_with(child);

          child.visit_stmt_within_child_scope(&*n.body);
      });
  }

  fn visit_for_of_stmt(&mut self, n: &ForOfStmt) {
      let child_mark = Mark::fresh(Mark::root());

      self.with_child(ScopeKind::Block, child_mark, |child| {
          n.left.visit_with(child);
          n.right.visit_with(child);

          child.visit_stmt_within_child_scope(&*n.body);
      });
  }

  fn visit_for_stmt(&mut self, n: &ForStmt) {
      let child_mark = Mark::fresh(Mark::root());

      self.ident_type = Some(IdentType::Binding);
      self.with_child(ScopeKind::Block, child_mark, |child| {
          n.init.visit_with(child);
      });

      self.ident_type = Some(IdentType::Ref);
      self.with_child(ScopeKind::Block, child_mark, |child| {
          n.test.visit_with(child);
      });

      self.ident_type = Some(IdentType::Ref);
      self.with_child(ScopeKind::Block, child_mark, |child| {
          n.update.visit_with(child);
          child.visit_stmt_within_child_scope(&*n.body);
      });
  }

  fn visit_function(&mut self, f: &Function) {
      f.type_params.visit_with(self);

      self.ident_type = Some(IdentType::Ref);
      f.decorators.visit_with(self);

      self.ident_type = Some(IdentType::Binding);
      f.params.visit_with(self);

      f.return_type.visit_with(self);

      self.ident_type = Some(IdentType::Ref);
      match &f.body {
          Some(body) => {
              // Prevent creating new scope.
              body.visit_children_with(self);
          }
          None => {}
      }
  }

  fn visit_import_decl(&mut self, n: &ImportDecl) {
      // Always resolve the import declaration identifiers even if it's type only.
      // We need to analyze these identifiers for type stripping purposes.
      self.ident_type = Some(IdentType::Binding);
      self.in_type = n.type_only;
      n.visit_children_with(self);
  }

  fn visit_import_named_specifier(&mut self, s: &ImportNamedSpecifier) {
      let old = self.ident_type;
      self.ident_type = Some(IdentType::Binding);
      s.local.visit_with(self);
      self.ident_type = old;
  }

  fn visit_method_prop(&mut self, m: &MethodProp) {
      m.key.visit_with(self);

      {
          let child_mark = Mark::fresh(Mark::root());

          self.with_child(ScopeKind::Fn, child_mark, |child| {
              m.function.visit_with(child);
          });
      };
  }

  fn visit_object_lit(&mut self, object_expr: &ObjectLit) {
      let child_mark = Mark::fresh(Mark::root());

      let bindings = {
          let mut child = ClosureIdentVisitor::from(
              self,
              Scope::new(ScopeKind::Fn, child_mark, Some(&self.scope)),
          );

          let old_in_object_expression = child.is_in_object_expression;
          child.is_in_object_expression = true;

          for prop in &object_expr.props {
              match prop {
                  PropOrSpread::Prop(p) => {
                      let old_in_object_prop = child.is_in_object_prop;
                      child.is_in_object_prop = true;
                      let prop = &**p;

                      // TODO: incomplete
                      match prop {
                          Prop::Shorthand(ident) => {
                              child.parent_object_prop_ident = Some(ident.clone());
                              prop.visit_children_with(&mut child);
                          }
                          Prop::KeyValue(KeyValueProp { value, .. }) => {
                              value.visit_children_with(&mut child);
                          }
                          _ => {
                              prop.visit_children_with(&mut child);
                          }
                      }

                      child.is_in_object_prop = old_in_object_prop;
                      child.parent_object_prop_ident = None;
                  }
                  PropOrSpread::Spread(..) => {}
              };
          }

          child.is_in_object_expression = old_in_object_expression;

          self.closure_generator.merge(child.closure_generator);

          child.scope.bindings
      };

      if !matches!(ScopeKind::Fn, ScopeKind::Fn { .. }) {
          let v = bindings;

          for (id, v) in v.into_iter().filter_map(|(id, v)| {
              if v.kind == VarType::Var(VarDeclKind::Var) {
                  Some((id, v))
              } else {
                  None
              }
          }) {
              let v: VarInfo = v;
              *v.value.borrow_mut() = None;
              self.scope.bindings.insert(id, v);
          }
      }
  }

  fn visit_param(&mut self, param: &Param) {
      self.ident_type = Some(IdentType::Binding);
      param.visit_children_with(self);
  }

  fn visit_assign_pat(&mut self, node: &AssignPat) {
      node.left.visit_with(self);
      node.right.visit_with(self);
  }

  fn visit_rest_pat(&mut self, node: &RestPat) {
      node.arg.visit_with(self);
  }

  fn visit_private_method(&mut self, m: &PrivateMethod) {
      m.key.visit_with(self);

      {
          let child_mark = Mark::fresh(Mark::root());

          self.with_child(ScopeKind::Fn, child_mark, |child| {
              m.function.visit_with(child);
          });
      }
  }

  fn visit_setter_prop(&mut self, n: &SetterProp) {
      n.key.visit_with(self);

      {
          let child_mark = Mark::fresh(Mark::root());

          self.with_child(ScopeKind::Fn, child_mark, |child| {
              child.ident_type = Some(IdentType::Binding);
              n.param.visit_with(child);
              n.body.visit_with(child);
          });
      };
  }

  fn visit_switch_stmt(&mut self, s: &SwitchStmt) {
      s.discriminant.visit_with(self);

      let child_mark = Mark::fresh(Mark::root());

      self.with_child(ScopeKind::Block, child_mark, |folder| {
          s.cases.visit_with(folder);
      });
  }

  fn visit_ident(&mut self, ident: &Ident) {
      if let Some(fn_name) = self.fn_name {
          if fn_name == ident {
              return;
          }
      }

      if self.globals.iter().any(|v| &*ident.sym == v) {
          self.ident_path = None;
          return;
      }
      if self.is_parent_member_expr {
          if !self.is_member_expr_computed {
              if let Some(parent_prop_ident) = &self.parent_member_expr_prop_ident {
                  if ident == parent_prop_ident {
                      self.add_to_path(ident.clone());
                      return;
                  }
              }
          } else {
              // if the property is computed, we don't want to capture it (and whatever follows it)
              // i.e. in a.b[c].d.e by setting ident_path to none we discard e and d, meanwhile c is
              // never added to the path
              self.ident_path = None;
              return;
          }
      }

      if self.is_in_object_expression && self.is_in_object_prop {
          if let Some(parent_prop_ident) = &self.parent_object_prop_ident {
              if ident != parent_prop_ident {
                  return;
              }
          }
      }

      if let Some(ident_type) = self.ident_type {
          if ident_type == IdentType::Ref {
              self.add_to_path(ident.clone());
              let mut current_scope = Some(&self.scope);
              while let Some(scope) = current_scope {
                  if scope.bindings.contains_key(&ident.to_id()) {
                      self.ident_path = None;
                      return;
                  }

                  current_scope = scope.parent;
              }

              
              if let Some(path) = self.ident_path.take() {
                  self.closure_generator.add_path(path);
              }
          } else if ident_type == IdentType::Binding {
              if let Some(decl_kind) = self.var_decl_kind {
                  self.scope.bindings.insert(ident.to_id(), VarInfo {
                      kind: VarType::Var(decl_kind),
                      value: RefCell::new(None)
                    });
              } else {
                self.scope.bindings.insert(ident.to_id(), VarInfo {
                    kind: VarType::Param,
                    value: RefCell::new(None)
                });
              }
          }
      }

      self.ident_path = None;
  }

  fn visit_assign_expr(&mut self, assign_expr: &AssignExpr) {
      // test for <something>.value = <something> expressions
      let left = &assign_expr.left;
      if let PatOrExpr::Expr(expr) = left {
          if let Expr::Member(member_expr) = &**expr {
              if let Expr::Ident(ident) = &*member_expr.obj {
                  if let MemberProp::Ident(prop) = &member_expr.prop {
                      if &*prop.sym == "value" {
                          self.outputs.insert(ident.clone());
                      }
                  }
              }
          }
      }
  }

  fn visit_var_declarator(&mut self, decl: &VarDeclarator) {
      // order is important

      let old_type = self.ident_type;
      self.ident_type = Some(IdentType::Binding);
      decl.name.visit_with(self);
      self.ident_type = old_type;

      decl.init.visit_children_with(self);
  }

  fn visit_var_decl(&mut self, decl: &VarDecl) {
      let old_kind = self.var_decl_kind;
      self.var_decl_kind = Some(decl.kind);
      decl.visit_children_with(self);
      self.var_decl_kind = old_kind;
  }
}