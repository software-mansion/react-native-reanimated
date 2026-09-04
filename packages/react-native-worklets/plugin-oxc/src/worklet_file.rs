use std::path::Path;

use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{Expression, Statement};
use oxc_span::SPAN;

use crate::imports::create_import_path;

const GENERATED_WORKLETS_DIR: &str = ".worklets";

pub fn generate_worklet_file<'a>(
    builder: AstBuilder<'a>,
    factory: Expression<'a>,
    imports: &[crate::types::ImportInfo],
    filename: &str,
    worklets_package_dir: Option<&str>,
) -> String {
    use oxc_ast::ast::ExportDefaultDeclarationKind;

    let mut body = builder.vec_with_capacity(imports.len() + 1);
    for info in imports {
        let is_rel = info.source.starts_with('.');
        if matches!(info.shape, crate::types::ImportShape::Default) && is_rel {
            continue;
        }
        let mut rebased = info.clone();
        if rebased.source.starts_with('.')
            && let Some(p) = create_import_path(filename, &rebased.source, worklets_package_dir)
        {
            rebased.source = p;
        }
        body.push(build_import_declaration(builder, &rebased));
    }
    let export =
        builder.alloc_export_default_declaration(SPAN, ExportDefaultDeclarationKind::from(factory));
    body.push(Statement::ExportDefaultDeclaration(export));

    let program = builder.program(
        SPAN,
        oxc_span::SourceType::mjs(),
        "",
        builder.vec(),
        None,
        builder.vec(),
        body,
    );
    let printed = oxc_codegen::Codegen::new()
        .with_options(oxc_codegen::CodegenOptions::default())
        .build(&program);

    if std::env::var("WORKLETS_WRITE_ORIGIN").is_ok() {
        return format!("// __workletOrigin: {filename}\n{}", printed.code);
    }
    printed.code
}

fn build_import_declaration<'a>(
    builder: AstBuilder<'a>,
    info: &crate::types::ImportInfo,
) -> Statement<'a> {
    use crate::types::ImportShape;
    use oxc_ast::ast::{ImportDeclarationSpecifier, ImportOrExportKind, ModuleExportName};

    let local_atom = builder.ident(&info.local);
    let local_binding = builder.binding_identifier(SPAN, local_atom);
    let specifier = match &info.shape {
        ImportShape::Default => ImportDeclarationSpecifier::ImportDefaultSpecifier(
            builder.alloc_import_default_specifier(SPAN, local_binding),
        ),
        ImportShape::Namespace => ImportDeclarationSpecifier::ImportNamespaceSpecifier(
            builder.alloc_import_namespace_specifier(SPAN, local_binding),
        ),
        ImportShape::Named { imported } => {
            let imported_atom = builder.ident(imported);
            let imported_name =
                ModuleExportName::IdentifierName(builder.identifier_name(SPAN, imported_atom));
            ImportDeclarationSpecifier::ImportSpecifier(builder.alloc_import_specifier(
                SPAN,
                imported_name,
                local_binding,
                ImportOrExportKind::Value,
            ))
        }
    };
    let specifiers = builder.vec1(specifier);

    let source_str = builder.str(&info.source);
    let source = builder.string_literal(SPAN, source_str, None);
    let decl = builder.alloc_import_declaration(
        SPAN,
        Some(specifiers),
        source,
        None,
        NONE,
        ImportOrExportKind::Value,
    );
    Statement::ImportDeclaration(decl)
}

pub fn write_worklet_file(
    worklets_package_dir: &str,
    file_path: &str,
    content: &str,
) -> Result<(), String> {
    let dir = Path::new(worklets_package_dir).join(GENERATED_WORKLETS_DIR);
    std::fs::create_dir_all(&dir)
        .map_err(|error| format!("could not create {}: {error}", dir.display()))?;
    let name = file_path.rsplit('/').next().unwrap_or(file_path);
    let path = dir.join(name);
    std::fs::write(&path, content)
        .map_err(|error| format!("could not write {}: {error}", path.display()))
}
