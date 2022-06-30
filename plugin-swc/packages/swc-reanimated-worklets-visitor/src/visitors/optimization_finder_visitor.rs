use swc_ecmascript::{
  ast::*,
  visit::Visit,
};

use crate::{constants::{STATEMENTLESS_FLAG, FUNCTIONLESS_FLAG, POSSIBLE_OPT_FUNCTION}, utils::get_callee_expr_ident};

pub struct OptimizationFinderVisitor {
  is_stmt: bool,
  is_fn_call: bool,
}

impl OptimizationFinderVisitor {
  pub fn new() -> Self {
      OptimizationFinderVisitor {
          is_stmt: false,
          is_fn_call: false,
      }
  }

  pub fn calculate_flags(&self) -> i32 {
      let mut flags = 0;
      if !self.is_fn_call {
          flags = flags | FUNCTIONLESS_FLAG;
      }

      if !self.is_stmt {
          flags = flags | STATEMENTLESS_FLAG;
      }

      flags
  }
}

impl Visit for OptimizationFinderVisitor {
  fn visit_if_stmt(&mut self, _if: &IfStmt) {
      self.is_stmt = true;
  }

  fn visit_call_expr(&mut self, call_expr: &CallExpr) {
      if let Callee::Expr(expr) = &call_expr.callee {
          let name = get_callee_expr_ident(&*expr);

          if let Some(name) = name {
              if !POSSIBLE_OPT_FUNCTION.iter().any(|v| *v == &*name.sym) {
                  self.is_fn_call = true;
              }
          }
      }
  }
}