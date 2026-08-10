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
mod file_directive;
mod jsx_dev_attributes;
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

/// Discriminator the JS shim matches on to tell a recoverable parse
/// failure from an internal plugin error. Keep in sync with `babel.js`.
const PARSE_ERROR_CODE: &str = "WORKLETS_ERR_PARSE";

pub use options::PluginOptions;
use state::{ImportInfo, ImportShape, State};
use transformer::Transformer;

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
    pub files: Vec<EmittedFile>,
}

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

fn is_generated_worklet_file(filename: &str) -> bool {
    filename.contains("react-native-worklets/.worklets")
}

fn run(
    source_text: &str,
    filename: &str,
    options: PluginOptions,
) -> Result<TransformResult, String> {
    maybe_warn_extras(&options);

    if is_generated_worklet_file(filename) {
        return Ok(TransformResult {
            code: source_text.to_string(),
            files: Vec::new(),
        });
    }

    let allocator = Allocator::default();
    let source_type = SourceType::from_path(filename).unwrap_or_else(|_| SourceType::cjs());
    let source_type = if source_type.is_javascript() {
        source_type.with_jsx(true)
    } else {
        source_type
    };

    let parsed = Parser::new(&allocator, source_text, source_type).parse();

    if !parsed.errors.is_empty() {
        let first = &parsed.errors[0];
        return Err(format!("{PARSE_ERROR_CODE} in {filename}: {first}"));
    }

    let mut program = parsed.program;

    if source_type.is_typescript() {
        let semantic_for_strip = SemanticBuilder::new()
            .with_check_syntax_error(false)
            .with_enum_eval(true)
            .build(&program)
            .semantic
            .into_scoping();
        let opts = oxc_transformer::TransformOptions {
            jsx: oxc_transformer::JsxOptions::disable(),
            typescript: oxc_transformer::TypeScriptOptions {
                only_remove_type_imports: true,
                ..Default::default()
            },
            ..Default::default()
        };
        let ret = oxc_transformer::Transformer::new(
            &allocator,
            std::path::Path::new(filename),
            &opts,
        )
        .build_with_scoping(semantic_for_strip, &mut program);
        if let Some(first) = ret.errors.first() {
            return Err(format!("{PARSE_ERROR_CODE} in {filename}: {first}"));
        }
    }

    let mut state = State::new(options, source_text.to_string());
    let builder = oxc_ast::AstBuilder::new(&allocator);

    file_directive::process_file_directive(&mut program, builder);

    let semantic_ret = SemanticBuilder::new()
        .with_check_syntax_error(false)
        .build(&program);
    let scoping = semantic_ret.semantic.into_scoping();

    state.imports_by_symbol = build_imports_index(&program);

    let emitted = worklet_pass::process_program(
        &mut program,
        &mut state,
        &scoping,
        builder,
        &allocator,
        filename,
    );

    let semantic_ret = SemanticBuilder::new()
        .with_check_syntax_error(false)
        .build(&program);
    let scoping_post = semantic_ret.semantic.into_scoping();
    let builder = oxc_ast::AstBuilder::new(&allocator);

    let transformer = Transformer::new_with_builder(state, builder, filename.to_string());
    transformer.run(&mut program, scoping_post, &allocator);

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
    let filename = filename.replace('\\', "/");
    let mut opts = options.unwrap_or_default();
    if let Some(dir) = opts.worklets_package_dir.take() {
        opts.worklets_package_dir = Some(dir.replace('\\', "/"));
    }
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
