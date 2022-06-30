mod constants;
pub use visitors::{WorkletsOptions, ReanimatedWorkletsVisitor};
mod utils;
mod visitors;

use crate::constants::{GLOBALS, LEAST_SIGNIFICANT_32_BITS};
use swc_ecmascript::{
    ast::*,
    visit::VisitMut,
};

// Reimplemented string-hash-64 used by the original plugin with i32 <-> f64 conversions mimicking those of JS
fn calculate_hash(value: &str) -> f64 {
    let mut hash1: f64 = 5381.0;
    let mut hash2: f64 = 52711.0;

    for char in value.chars().rev().map(|x| { x as i32 }) {
        hash1 = i32::from_ne_bytes((((hash1 * 33.0) as i64 & LEAST_SIGNIFICANT_32_BITS) as i32 ^ char).to_ne_bytes()) as f64;
        hash2 = i32::from_ne_bytes((((hash2 * 33.0) as i64 & LEAST_SIGNIFICANT_32_BITS) as i32 ^ char).to_ne_bytes()) as f64;
    }

    return ((u64::from_ne_bytes((hash1 as i64 & LEAST_SIGNIFICANT_32_BITS).to_ne_bytes()) as f64) * 4096.0) + (u64::from_ne_bytes((hash2 as i64 & LEAST_SIGNIFICANT_32_BITS).to_ne_bytes()) as f64);
}

pub fn create_worklets_visitor<
    C: Clone + swc_common::comments::Comments,
    S: swc_common::SourceMapper + SourceMapperExt,
>(
    worklets_options: WorkletsOptions,
    source_map: std::sync::Arc<S>,
    comments: C,
) -> impl VisitMut {
    let mut globals_vec = GLOBALS.map(|v| v.to_string()).to_vec();

    // allows adding custom globals such as host-functions
    if let Some(custom_globals) = worklets_options.custom_globals {
        globals_vec.extend(custom_globals);
    };

    ReanimatedWorkletsVisitor::new(
        source_map,
        globals_vec,
        worklets_options.filename,
        worklets_options.relative_cwd,
        comments,
    )
}
