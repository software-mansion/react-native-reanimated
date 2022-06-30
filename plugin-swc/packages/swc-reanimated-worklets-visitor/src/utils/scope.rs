use indexmap::IndexMap;
use swc_common::Mark;
use std::cell::RefCell;

use swc_ecmascript::{
  ast::*
};


#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScopeKind {
    Block,
    Fn,
}

impl Default for ScopeKind {
    fn default() -> Self {
        ScopeKind::Fn
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IdentType {
    Binding,
    Ref,
    Label,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VarType {
    Param,
    Var(VarDeclKind),
}

#[derive(Debug)]
pub struct VarInfo {
    pub kind: VarType,
    pub value: RefCell<Option<Expr>>,
}

#[derive(Default, Debug)]
pub struct Scope<'a> {
    /// Parent scope of the scope
    pub parent: Option<&'a Scope<'a>>,
    /// [Mark] of the current scope.
    mark: Mark,
    /// Kind of the scope.
    kind: ScopeKind,
    pub bindings: IndexMap<Id, VarInfo, ahash::RandomState>,
}

impl<'a> Scope<'a> {
    pub fn new(kind: ScopeKind, mark: Mark, parent: Option<&'a Scope<'a>>) -> Self {
        Scope {
            parent,
            kind,
            mark,
            bindings: Default::default(),
        }
    }
}
