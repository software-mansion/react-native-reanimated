use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};

use napi_derive::napi;
use oxc_allocator::Allocator;
use oxc_ast::ast::{ImportDeclaration, ImportDeclarationSpecifier, Program, Statement};
use oxc_codegen::{Codegen, CodegenOptions};
use oxc_parser::Parser;
use oxc_semantic::SemanticBuilder;
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
fn build_imports_index<'a>(program: &Program<'a>) -> HashMap<SymbolId, ImportInfo> {
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

/// Emit a one-time warning when the user passes `extraPlugins`/`extraPresets`,
/// since the OXC transform can't dispatch arbitrary Babel plugins. Quiet for
/// empty/missing values so the common case stays silent.
fn maybe_warn_extras(options: &PluginOptions) {
    static WARNED: AtomicBool = AtomicBool::new(false);
    let has_extras = options
        .extra_plugins
        .as_ref()
        .map(|v| !v.is_empty())
        .unwrap_or(false)
        || options
            .extra_presets
            .as_ref()
            .map(|v| !v.is_empty())
            .unwrap_or(false);
    if !has_extras {
        return;
    }
    if WARNED.swap(true, Ordering::Relaxed) {
        return;
    }
    eprintln!(
        "[worklets-plugin-oxc] `extraPlugins`/`extraPresets` are accepted for option-surface \
         compatibility with `react-native-worklets/plugin` but ignored — the OXC transform \
         cannot dispatch arbitrary Babel plugins. Compose them around this plugin in \
         babel.config.js instead."
    );
}

fn run(
    source_text: &str,
    filename: &str,
    options: PluginOptions,
) -> Result<TransformResult, String> {
    maybe_warn_extras(&options);
    let allocator = Allocator::default();
    // `SourceType::from_path` recognises `.ts`/`.tsx`/`.js`/`.jsx`/`.mjs`/`.cjs`.
    // For genuinely unknown extensions we fall back to plain JS — falling back
    // to TSX accidentally lets `.cjs`/`.mjs` files (handled correctly above) be
    // re-parsed as TSX in error paths and breaks user files with type-cast-like
    // identifiers (e.g. `a as b`).
    let source_type = SourceType::from_path(filename).unwrap_or_else(|_| SourceType::cjs());

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
        // `with_enum_eval(true)` is required by oxc_transformer's TS enum pass —
        // without it, transforming `enum Foo { … }` panics at
        // `oxc_transformer/src/typescript/enum.rs`.
        let semantic_for_strip = SemanticBuilder::new()
            .with_check_syntax_error(false)
            .with_enum_eval(true)
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

    let state = State::new(options, source_text.to_string());
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
    state.imports_by_symbol = build_imports_index(&program);

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
    // Catch panics so a bug in any sub-pass becomes a recoverable napi error
    // instead of aborting the bundler process. `run` only touches the
    // arguments passed in (no shared mutable state), so `AssertUnwindSafe`
    // is sound here.
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        run(&source_text, &filename, opts)
    }));
    match result {
        Ok(Ok(value)) => Ok(value),
        Ok(Err(msg)) => Err(napi::Error::from_reason(format!(
            "[Worklets] Babel plugin exception: {msg}"
        ))),
        Err(payload) => {
            let msg = panic_payload_to_string(payload);
            Err(napi::Error::from_reason(format!(
                "[Worklets] Babel plugin exception (panic): {msg} (file: {filename})"
            )))
        }
    }
}

fn panic_payload_to_string(payload: Box<dyn std::any::Any + Send>) -> String {
    if let Some(s) = payload.downcast_ref::<&'static str>() {
        return (*s).to_string();
    }
    if let Some(s) = payload.downcast_ref::<String>() {
        return s.clone();
    }
    "unknown panic".to_string()
}
