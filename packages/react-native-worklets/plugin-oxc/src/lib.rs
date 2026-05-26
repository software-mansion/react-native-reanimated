use std::collections::HashMap;

use napi_derive::napi;
use oxc_allocator::Allocator;
use oxc_ast::ast::{
    ImportDeclaration, ImportDeclarationSpecifier, ModuleDeclaration, Program, Statement,
};
use oxc_codegen::{Codegen, CodegenOptions};
use oxc_parser::Parser;
use oxc_semantic::{Scoping, SemanticBuilder};
use oxc_span::SourceType;
use oxc_syntax::symbol::SymbolId;

mod auto_detect;
mod closure;
mod context_object;
mod file_directive;
mod globals;
mod relative_requires;
mod naming;
mod options;
mod state;
mod transformer;
mod utils;
mod worklet_body;
mod worklet_class;
mod worklet_factory;
mod worklet_pass;

pub use options::PluginOptions;
use state::{ImportInfo, ImportShape, State};
use transformer::Transformer;

/// Walk top-level `import` statements and produce `SymbolId → ImportInfo` so
/// bundle-mode emission can synthesise matching imports in each emitted
/// `.worklets/<hash>.js` file.
fn build_imports_index<'a>(
    program: &Program<'a>,
    scoping: &Scoping,
) -> HashMap<SymbolId, ImportInfo> {
    let mut out = HashMap::new();
    for stmt in &program.body {
        let import: &ImportDeclaration = match stmt {
            Statement::ImportDeclaration(d) => d,
            _ => continue,
        };
        let source = import.source.value.as_str().to_string();
        let Some(specifiers) = &import.specifiers else {
            continue;
        };
        for spec in specifiers {
            let (local_id, shape) = match spec {
                ImportDeclarationSpecifier::ImportSpecifier(s) => {
                    let imported_name = match &s.imported {
                        oxc_ast::ast::ModuleExportName::IdentifierName(n) => n.name.to_string(),
                        oxc_ast::ast::ModuleExportName::IdentifierReference(n) => {
                            n.name.to_string()
                        }
                        oxc_ast::ast::ModuleExportName::StringLiteral(n) => n.value.to_string(),
                    };
                    (
                        &s.local,
                        ImportShape::Named {
                            imported: imported_name,
                        },
                    )
                }
                ImportDeclarationSpecifier::ImportDefaultSpecifier(s) => {
                    (&s.local, ImportShape::Default)
                }
                ImportDeclarationSpecifier::ImportNamespaceSpecifier(s) => {
                    (&s.local, ImportShape::Namespace)
                }
            };
            if let Some(sid) = local_id.symbol_id.get() {
                out.insert(
                    sid,
                    ImportInfo {
                        source: source.clone(),
                        local: local_id.name.to_string(),
                        shape,
                    },
                );
            }
        }
    }
    let _ = scoping; // reserved for future use (e.g. cross-reference lookups)
    out
}

#[napi(object)]
pub struct EmittedFile {
    pub path: String,
    pub content: String,
}

#[napi(object)]
pub struct TransformResult {
    pub code: String,
    /// Files the plugin wants to emit alongside the transformed source.
    /// In bundle mode each worklet factory is written to its own
    /// `react-native-worklets/.worklets/<hash>.js` file; the JS host is
    /// responsible for actually writing them (so test harnesses can
    /// intercept via `fs.writeFileSync` mocking).
    pub files: Vec<EmittedFile>,
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

    // Strip TypeScript first so every subsequent pass (and the host's
    // re-parse on the JS side) operates on plain JS. oxc parses TS leniently
    // — accepts things like `x as any = y` and parameter properties — which
    // babel's stricter TS parser then rejects on the re-parse round trip.
    if source_type.is_typescript() {
        let semantic_for_strip = SemanticBuilder::new()
            .with_check_syntax_error(false)
            .build(&program)
            .semantic
            .into_scoping();
        // `TransformOptions::default()` enables JSX transformation too, which
        // turns `<Foo />` into `_jsx(Foo)` and breaks downstream visitors
        // (e.g. our inline-styles warning, which looks for JSXAttribute
        // named "style"). Disable JSX so this pass *only* strips TS.
        let opts = oxc_transformer::TransformOptions {
            jsx: oxc_transformer::JsxOptions::disable(),
            ..Default::default()
        };
        let _ = oxc_transformer::Transformer::new(
            &allocator,
            std::path::Path::new(filename),
            &opts,
        )
        .build_with_scoping(semantic_for_strip, &mut program);
    }

    let semantic_ret = SemanticBuilder::new()
        .with_check_syntax_error(false)
        .build(&program);
    let scoping = semantic_ret.semantic.into_scoping();

    let state = State::new(options);
    let builder = oxc_ast::AstBuilder::new(&allocator);

    file_directive::process_file_directive(&mut program, builder);

    let transformer = Transformer::new_with_builder(state, builder, filename.to_string());
    let mut state = transformer.run_and_take(&mut program, scoping, &allocator);

    let semantic_ret = SemanticBuilder::new()
        .with_check_syntax_error(false)
        .build(&program);
    let scoping_post = semantic_ret.semantic.into_scoping();
    let builder = oxc_ast::AstBuilder::new(&allocator);

    // Index top-level imports so bundle-mode emission can re-emit them
    // into each `.worklets/<hash>.js` file. Done once, after TS strip + any
    // other AST mutations that may have happened above.
    state.imports_by_symbol = build_imports_index(&program, &scoping_post);

    let emitted = worklet_pass::process_program(
        &mut program,
        &mut state,
        &scoping_post,
        builder,
        &allocator,
        filename,
    );

    let printed = Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&program);

    let files = emitted
        .into_iter()
        .map(|(path, content)| EmittedFile { path, content })
        .collect();

    Ok(TransformResult {
        code: printed.code,
        files,
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
