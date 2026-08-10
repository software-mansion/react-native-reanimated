use oxc_allocator::Allocator;
use oxc_ast::AstBuilder;
use oxc_ast::ast::Program;
use oxc_semantic::Scoping;
use oxc_traverse::{Traverse, TraverseCtx, traverse_mut};

use crate::state::State;

pub mod builders;
mod bundle_mode;

pub struct Transformer<'a> {
    pub state: State,
    pub builder: AstBuilder<'a>,
    pub filename: String,
}

impl<'a> Transformer<'a> {
    pub fn new_with_builder(state: State, builder: AstBuilder<'a>, filename: String) -> Self {
        Self {
            state,
            builder,
            filename,
        }
    }

    pub fn run_and_take(
        mut self,
        program: &mut Program<'a>,
        scoping: Scoping,
        allocator: &'a Allocator,
    ) -> State {
        traverse_mut(&mut self, allocator, program, scoping, ());
        self.state
    }
}

impl<'a> Traverse<'a, ()> for Transformer<'a> {
    fn enter_expression_statement(
        &mut self,
        node: &mut oxc_ast::ast::ExpressionStatement<'a>,
        _ctx: &mut TraverseCtx<'a, ()>,
    ) {
        bundle_mode::toggle_bundle_mode(node, &self.state, &self.filename, self.builder);
    }
}
