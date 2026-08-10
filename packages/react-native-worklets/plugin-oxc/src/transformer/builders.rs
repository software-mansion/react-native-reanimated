
use oxc_allocator::Box as ArenaBox;
use oxc_ast::ast::{
    BindingRestElement,
};

#[inline]
pub fn no_rest<'a>() -> Option<ArenaBox<'a, BindingRestElement<'a>>> {
    None
}
