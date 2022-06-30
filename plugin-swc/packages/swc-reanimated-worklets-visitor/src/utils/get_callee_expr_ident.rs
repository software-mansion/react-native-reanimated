use swc_ecmascript::{
  ast::*,
};

// Trying to get an ident from expr. This is for The call_expr's callee,
// does not cover all of expr cases.
pub fn get_callee_expr_ident(expr: &Expr) -> Option<Ident> {
  match expr {
      Expr::Member(member_expr) => match &member_expr.prop {
          MemberProp::Ident(ident) => Some(ident.clone()),
          MemberProp::PrivateName(PrivateName { id, .. }) => Some(id.clone()),
          MemberProp::Computed(ComputedPropName { expr, .. }) => get_callee_expr_ident(&*expr),
      },
      Expr::Fn(FnExpr { ident, .. }) => ident.clone(),
      Expr::Call(CallExpr { callee, .. }) => {
          if let Callee::Expr(expr) = callee {
              get_callee_expr_ident(&*expr)
          } else {
              None
          }
      }
      Expr::Ident(ident) => Some(ident.clone()),
      Expr::Class(ClassExpr { ident, .. }) => ident.clone(),
      Expr::Paren(ParenExpr { expr, .. }) => get_callee_expr_ident(&*expr),
      Expr::JSXMember(JSXMemberExpr { prop, .. }) => Some(prop.clone()),
      Expr::JSXNamespacedName(JSXNamespacedName { name, .. }) => Some(name.clone()),
      Expr::PrivateName(PrivateName { id, .. }) => Some(id.clone()),
      _ => None,
  }
}
