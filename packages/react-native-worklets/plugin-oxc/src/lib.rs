use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};

use napi_derive::napi;
use oxc_allocator::Allocator;
use oxc_ast::ast::{ImportDeclaration, ImportDeclarationSpecifier, Program, Statement};
use oxc_codegen::{Codegen, CodegenOptions};
use oxc_parser::{ParseOptions, Parser};
use oxc_semantic::SemanticBuilder;
use oxc_span::{SourceType, Span};
use oxc_syntax::symbol::SymbolId;

mod autoworkletization;
mod bundle_mode;
mod closure;
mod imports;
mod jsx_dev_attributes;
mod naming;
mod options;
mod plugin;
mod referenced_worklets;
mod type_assertions;
mod types;
mod utils;
mod worklet_factory;
mod worklet_string_code;

const PARSE_ERROR_CODE: &str = "WORKLETS_ERR_PARSE";

const GENERATED_WORKLETS_DIR: &str = ".worklets";

pub use options::PluginOptions;
use types::{ImportInfo, ImportShape, State};

#[napi(object)]
pub struct EmittedFile {
    pub path: String,
    pub content: String,
}

#[napi(object)]
pub struct TransformResult {
    pub code: String,
    pub map: Option<String>,
    pub files: Vec<EmittedFile>,
    pub changed: bool,
}

#[napi(object)]
pub struct WorkletSourceTokens {
    pub hooks: Vec<String>,
    pub methods: Vec<String>,
}

#[napi]
pub fn worklet_source_tokens() -> WorkletSourceTokens {
    let hooks = referenced_worklets::FUNCTION_HOOKS
        .iter()
        .map(|(name, _)| (*name).to_string())
        .chain(
            autoworkletization::GESTURE_HANDLER_OBJECT_HOOKS
                .iter()
                .map(|name| (*name).to_string()),
        )
        .collect();
    let methods = autoworkletization::LAYOUT_ANIMATION_CALLBACKS
        .iter()
        .chain(autoworkletization::GESTURE_HANDLER_BUILDER_METHODS.iter())
        .map(|name| (*name).to_string())
        .collect();
    WorkletSourceTokens { hooks, methods }
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

fn run(
    source_text: &str,
    filename: &str,
    options: PluginOptions,
) -> Result<TransformResult, String> {
    if options.bundle_mode == Some(false) {
        return Err(
            "`bundleMode: false` is not supported — this plugin supports Bundle Mode only. \
             Use `react-native-worklets/plugin` for the legacy pipeline."
                .to_string(),
        );
    }

    maybe_warn_extras(&options);

    if is_generated_worklet_file(filename) {
        return Ok(TransformResult {
            code: source_text.to_string(),
            map: None,
            files: Vec::new(),
            changed: false,
        });
    }

    let allocator = Allocator::default();
    let source_type = SourceType::from_path(filename).unwrap_or_else(|_| SourceType::cjs());
    let source_type = if source_type.is_javascript() {
        source_type.with_jsx(true)
    } else {
        source_type
    };

    let parsed = Parser::new(&allocator, source_text, source_type)
        .with_options(ParseOptions {
            preserve_parens: false,
            ..ParseOptions::default()
        })
        .parse();

    if !parsed.errors.is_empty() {
        let first = &parsed.errors[0];
        return Err(format!("{PARSE_ERROR_CODE} in {filename}: {first}"));
    }

    let mut program = parsed.program;

    let type_asserted = type_assertions::TypeAssertions::collect(&program);

    if source_type.is_typescript() {
        strip_typescript(&mut program, &allocator, filename)?;
    }

    let mut state = State::new(options, source_text.to_string());
    let builder = oxc_ast::AstBuilder::new(&allocator);

    let semantic_ret = SemanticBuilder::new()
        .with_check_syntax_error(false)
        .build(&program);
    let scoping = semantic_ret.semantic.into_scoping();

    state.imports_by_symbol = build_imports_index(&program);

    let emitted = plugin::process_program(
        &mut program,
        &mut state,
        &scoping,
        builder,
        &allocator,
        filename,
        &type_asserted,
    );

    if let Some(message) = state.error.take() {
        return Err(message);
    }

    let flag_enabled = bundle_mode::enable_flag(&mut program, builder, filename, &type_asserted);

    let printed = Codegen::new()
        .with_options(CodegenOptions {
            source_map_path: Some(std::path::PathBuf::from(filename)),
            ..CodegenOptions::default()
        })
        .build(&program);

    let files: Vec<EmittedFile> = emitted
        .into_iter()
        .map(|(path, content)| EmittedFile { path, content })
        .collect();

    if let Some(package_dir) = state.opts.worklets_package_dir.as_deref() {
        write_emitted_files(&files, package_dir)?;
    }

    Ok(TransformResult {
        code: printed.code,
        map: printed.map.map(|map| map.to_json_string()),
        changed: flag_enabled || !files.is_empty(),
        files,
    })
}

fn write_emitted_files(files: &[EmittedFile], worklets_package_dir: &str) -> Result<(), String> {
    if files.is_empty() {
        return Ok(());
    }
    let dir = std::path::Path::new(worklets_package_dir).join(GENERATED_WORKLETS_DIR);
    std::fs::create_dir_all(&dir)
        .map_err(|error| format!("could not create {}: {error}", dir.display()))?;
    for file in files {
        let name = file.path.rsplit('/').next().unwrap_or(&file.path);
        let path = dir.join(name);
        std::fs::write(&path, &file.content)
            .map_err(|error| format!("could not write {}: {error}", path.display()))?;
    }
    Ok(())
}

fn strip_typescript<'a>(
    program: &mut Program<'a>,
    allocator: &'a Allocator,
    filename: &str,
) -> Result<(), String> {
    let specifier_bearing_imports: Vec<Span> = program
        .body
        .iter()
        .filter_map(|stmt| match stmt {
            Statement::ImportDeclaration(import)
                if import.specifiers.as_ref().is_some_and(|s| !s.is_empty()) =>
            {
                Some(import.span)
            }
            _ => None,
        })
        .collect();

    let semantic_for_strip = SemanticBuilder::new()
        .with_check_syntax_error(false)
        .with_enum_eval(true)
        .build(program)
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
    let ret = oxc_transformer::Transformer::new(allocator, std::path::Path::new(filename), &opts)
        .build_with_scoping(semantic_for_strip, program);
    if let Some(first) = ret.errors.first() {
        return Err(format!("{PARSE_ERROR_CODE} in {filename}: {first}"));
    }

    program.body.retain(|stmt| {
        let Statement::ImportDeclaration(import) = stmt else {
            return true;
        };
        let now_empty = import.specifiers.as_ref().is_none_or(|s| s.is_empty());
        !now_empty || !specifier_bearing_imports.contains(&import.span)
    });

    Ok(())
}

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

fn is_generated_worklet_file(filename: &str) -> bool {
    filename.contains("react-native-worklets/.worklets")
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
        "[Worklets] `extraPlugins`/`extraPresets` are accepted for option-surface \
         compatibility with `react-native-worklets/plugin` but ignored — the OXC transform \
         cannot dispatch arbitrary Babel plugins. Compose them around this plugin in \
         babel.config.js instead."
    );
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
