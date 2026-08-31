use oxc_allocator::Allocator;
use oxc_ast::ast::Program;
use oxc_ast::AstBuilder;
use oxc_ast_visit::VisitMut;
use oxc_semantic::Scoping;

use crate::autoworkletization::add_directives_to_known_callbacks;
use crate::types::State;
use crate::worklet_pass::WorkletPass;

pub fn process_program<'a>(
    program: &mut Program<'a>,
    state: &mut State,
    scoping: &mut Scoping,
    builder: AstBuilder<'a>,
    allocator: &'a Allocator,
    filename: &str,
) -> Vec<(String, String)> {
    state.error = add_directives_to_known_callbacks(program, &*scoping, builder);

    WorkletPass::new(state, scoping, builder, allocator, filename).visit_program(program);

    std::mem::take(&mut state.emitted_files)
}
