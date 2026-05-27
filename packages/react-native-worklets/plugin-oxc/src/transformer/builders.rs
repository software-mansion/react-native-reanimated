//! Shared aliases for the `None` Box options that oxc's `AstBuilder` methods take.
//! These keep call sites readable without leaking generic annotations.

use oxc_allocator::Box as ArenaBox;
use oxc_ast::ast::{
    BindingRestElement, FormalParameterRest, TSTypeAnnotation, TSTypeParameterDeclaration,
    TSTypeParameterInstantiation,
};

pub type OptTypeArgs<'a> = Option<ArenaBox<'a, TSTypeParameterInstantiation<'a>>>;
pub type OptTypeParams<'a> = Option<ArenaBox<'a, TSTypeParameterDeclaration<'a>>>;
pub type OptReturnType<'a> = Option<ArenaBox<'a, TSTypeAnnotation<'a>>>;
pub type OptFormalRest<'a> = Option<ArenaBox<'a, FormalParameterRest<'a>>>;

#[inline]
pub fn no_rest<'a>() -> Option<ArenaBox<'a, BindingRestElement<'a>>> {
    None
}
