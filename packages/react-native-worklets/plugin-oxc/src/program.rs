use std::collections::HashMap;

use oxc_allocator::Allocator;
use oxc_ast::ast::{ImportDeclaration, ImportDeclarationSpecifier, Program, Statement};
use oxc_codegen::{Codegen, CodegenOptions};
use oxc_parser::{ParseOptions, Parser};
use oxc_semantic::SemanticBuilder;
use oxc_span::{SourceType, Span};
use oxc_syntax::symbol::SymbolId;

use crate::types::{ImportInfo, ImportShape, State};
use crate::{EmittedFile, PluginOptions, TransformResult};
use crate::{bundle_mode, file_directive, plugin};

const PARSE_ERROR_CODE: &str = "WORKLETS_ERR_PARSE";
const FLOW_ERROR_CODE: &str = "WORKLETS_ERR_FLOW";
const FLOW_DIAGNOSTIC: &str = "Flow is not supported";

pub fn run(
    source_text: &str,
    filename: &str,
    options: PluginOptions,
) -> Result<TransformResult, String> {
    if is_generated_worklet_file(filename) {
        return Ok(TransformResult {
            code: source_text.to_string(),
            map: None,
            files: Vec::new(),
            changed: false,
        });
    }

    let allocator = Allocator::default();
    let source_type = source_type_of(filename);
    let mut program = parse_program(&allocator, source_text, filename, source_type)?;
    let builder = oxc_ast::AstBuilder::new(&allocator);

    let is_worklet_file = file_directive::process_file_directive(&mut program, builder);

    if source_type.is_typescript() {
        strip_typescript(&mut program, &allocator, filename)?;
    }

    let mut state = State::new(options, source_text.to_string());

    let flag_enabled = bundle_mode::enable_flag(&mut program, builder, filename);

    let semantic_ret = SemanticBuilder::new()
        .with_check_syntax_error(false)
        .build(&program);
    let mut scoping = semantic_ret.semantic.into_scoping();

    state.imports_by_symbol = build_imports_index(&program);

    let emitted = plugin::process_program(
        &mut program,
        &mut state,
        &mut scoping,
        builder,
        &allocator,
        filename,
    );

    if let Some(message) = state.error.take() {
        return Err(message);
    }

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

    Ok(TransformResult {
        code: printed.code,
        map: printed.map.map(|map| map.to_json_string()),
        changed: flag_enabled || is_worklet_file || !files.is_empty(),
        files,
    })
}

fn source_type_of(filename: &str) -> SourceType {
    let source_type = SourceType::from_path(filename).unwrap_or_else(|_| SourceType::cjs());
    if source_type.is_javascript() {
        source_type.with_jsx(true)
    } else {
        source_type
    }
}

fn parse_program<'a>(
    allocator: &'a Allocator,
    source_text: &'a str,
    filename: &str,
    source_type: SourceType,
) -> Result<Program<'a>, String> {
    let parsed = Parser::new(allocator, source_text, source_type)
        .with_options(ParseOptions {
            preserve_parens: false,
            ..ParseOptions::default()
        })
        .parse();

    if !parsed.errors.is_empty() {
        return Err(parse_error(filename, &parsed.errors[0]));
    }

    Ok(parsed.program)
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
        return Err(parse_error(filename, first));
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
            let shape = match spec {
                ImportDeclarationSpecifier::ImportSpecifier(s) => ImportShape::Named {
                    imported: s.imported.name().to_string(),
                },
                ImportDeclarationSpecifier::ImportDefaultSpecifier(_) => ImportShape::Default,
                ImportDeclarationSpecifier::ImportNamespaceSpecifier(_) => ImportShape::Namespace,
            };
            let local_id = spec.local();
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

fn parse_error(filename: &str, first: &impl std::fmt::Display) -> String {
    let message = first.to_string();
    let code = if message.contains(FLOW_DIAGNOSTIC) {
        FLOW_ERROR_CODE
    } else {
        PARSE_ERROR_CODE
    };
    format!("{code} in {filename}: {message}")
}
