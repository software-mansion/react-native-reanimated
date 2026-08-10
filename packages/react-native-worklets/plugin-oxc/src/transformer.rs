use oxc_allocator::Allocator;
use oxc_ast::AstBuilder;
use oxc_ast::ast::Program;
use oxc_semantic::Scoping;
use oxc_traverse::{Traverse, TraverseCtx, traverse_mut};

pub mod builders;
mod bundle_mode;

pub struct Transformer<'a> {
    pub builder: AstBuilder<'a>,
    pub is_bundle_mode_toggle_file: bool,
}

impl<'a> Transformer<'a> {
    pub fn new_with_builder(builder: AstBuilder<'a>, filename: &str) -> Self {
        Self {
            builder,
            is_bundle_mode_toggle_file: bundle_mode::is_toggle_target(filename),
        }
    }

    pub fn run(
        mut self,
        program: &mut Program<'a>,
        scoping: Scoping,
        allocator: &'a Allocator,
    ) {
        traverse_mut(&mut self, allocator, program, scoping, ());
    }
}

impl<'a> Traverse<'a, ()> for Transformer<'a> {
    fn enter_expression_statement(
        &mut self,
        node: &mut oxc_ast::ast::ExpressionStatement<'a>,
        _ctx: &mut TraverseCtx<'a, ()>,
    ) {
        if self.is_bundle_mode_toggle_file {
            bundle_mode::toggle_bundle_mode(node, self.builder);
        }
    }
}
