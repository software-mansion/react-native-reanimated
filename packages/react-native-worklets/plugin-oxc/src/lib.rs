use napi_derive::napi;
use oxc_allocator::Allocator;
use oxc_codegen::{Codegen, CodegenOptions};
use oxc_parser::Parser;
use oxc_semantic::SemanticBuilder;
use oxc_span::SourceType;

mod closure;
mod globals;
mod naming;
mod options;
mod state;
mod transformer;
mod utils;

pub use options::PluginOptions;
use state::State;
use transformer::Transformer;

#[napi(object)]
pub struct TransformResult {
    pub code: String,
}

fn run(
    source_text: &str,
    filename: &str,
    options: PluginOptions,
) -> Result<TransformResult, String> {
    let allocator = Allocator::default();
    let source_type = SourceType::from_path(filename).unwrap_or(SourceType::tsx());

    let parsed = Parser::new(&allocator, source_text, source_type).parse();

    if !parsed.errors.is_empty() {
        let first = &parsed.errors[0];
        return Err(format!("Parse error in {filename}: {first}"));
    }

    let mut program = parsed.program;

    let semantic_ret = SemanticBuilder::new()
        .with_check_syntax_error(false)
        .build(&program);
    let scoping = semantic_ret.semantic.into_scoping();

    let state = State::new(options);
    let transformer = Transformer::new(state, &allocator, filename.to_string());
    transformer.run(&mut program, scoping, &allocator);

    let printed = Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&program);

    Ok(TransformResult {
        code: printed.code,
    })
}

#[napi]
pub fn transform(
    source_text: String,
    filename: String,
    options: Option<PluginOptions>,
) -> napi::Result<TransformResult> {
    let opts = options.unwrap_or_default();
    run(&source_text, &filename, opts).map_err(|msg| {
        napi::Error::from_reason(format!("[Worklets] Babel plugin exception: {msg}"))
    })
}
