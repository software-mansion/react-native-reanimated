use swc_common::util::take::Take;
use swc_ecmascript::{
  ast::*,
  visit::{VisitMut, VisitMutWith},
};

/// Locate `'worklet';` directives and performs necessary transformation
/// if directive found.
/// - Removes comments explicitly
/// - Removes `worklet`; directive itself
pub struct DirectiveFinderVisitor<C: Clone + swc_common::comments::Comments> {
  pub has_worklet_directive: bool,
  in_fn_parent_node: bool,
  comments: C,
}

impl<C: Clone + swc_common::comments::Comments> DirectiveFinderVisitor<C> {
  pub fn new(comments: C) -> Self {
      DirectiveFinderVisitor {
          has_worklet_directive: false,
          in_fn_parent_node: false,
          comments,
      }
  }
}

impl<C: Clone + swc_common::comments::Comments> VisitMut for DirectiveFinderVisitor<C> {
  fn visit_mut_expr(&mut self, expr: &mut Expr) {
      let old = self.in_fn_parent_node;
      match expr {
          Expr::Arrow(..) | Expr::Fn(..) => {
              self.in_fn_parent_node = true;
          }
          _ => {}
      }

      expr.visit_mut_children_with(self);
      self.in_fn_parent_node = old;
  }

  fn visit_mut_stmt(&mut self, stmt: &mut Stmt) {
      // TODO: There's no directive visitor
      if let Stmt::Expr(ExprStmt { expr, .. }) = stmt {
          if let Expr::Lit(Lit::Str(Str { value, .. })) = &**expr {
              if &*value == "worklet" {
                  self.has_worklet_directive = true;
                  // remove 'worklet'; directive before calling .toString()
                  *stmt = Stmt::dummy();
              }
          }
      }

      if self.has_worklet_directive {
          // remove comments if there's worklet directive.
          // TODO:
          // 1. This is not complete
          // 2. Do we need utility like .remove_comments_recursively()
          match &stmt {
              Stmt::Expr(ExprStmt { span, .. }) | Stmt::Return(ReturnStmt { span, .. }) => {
                  self.comments.take_leading(span.hi);
                  self.comments.take_leading(span.lo);
                  self.comments.take_trailing(span.hi);
                  self.comments.take_trailing(span.lo);
              }
              _ => {}
          };
      }
  }
}