use oxc_allocator::TakeIn;
use oxc_ast::AstBuilder;
use oxc_ast::NONE;
use oxc_ast::ast::{Expression, Statement, VariableDeclarationKind};
use oxc_span::SPAN;

use crate::ast::identifier_binding_pattern;
use crate::factory_expression::build_member_assign;

pub const WORKLET_MODULE_DIRECTIVE: &str = "worklet-module";

pub const INLINE_MODULE_SPECIFIER_PREFIX: &str = "metro:inline;base64,";
const WORKLET_MODULE_ID_BINDING: &str = "__workletModuleId";

pub fn generate_worklet_module_specifier<'a>(
    builder: AstBuilder<'a>,
    mut factory: Expression<'a>,
    imports: &[crate::types::ImportInfo],
    closure_variables: &[String],
    react_name: &str,
) -> (String, String) {
    use oxc_ast::ast::ExportDefaultDeclarationKind;

    let mut module_id_binding = WORKLET_MODULE_ID_BINDING.to_string();
    while module_id_binding == react_name
        || closure_variables
            .iter()
            .any(|name| *name == module_id_binding)
        || imports.iter().any(|info| info.local == module_id_binding)
    {
        module_id_binding = format!("_{module_id_binding}");
    }

    let mut body = builder.vec_with_capacity(imports.len() + 3);
    for info in imports {
        body.push(build_import_declaration(builder, info));
    }
    let binding_atom = builder.ident(&module_id_binding);
    let read_module_id = builder.variable_declarator(
        SPAN,
        VariableDeclarationKind::Const,
        identifier_binding_pattern(builder, &module_id_binding),
        NONE,
        Some(Expression::from(builder.member_expression_static(
            SPAN,
            builder.expression_identifier(SPAN, "module"),
            builder.identifier_name(SPAN, "id"),
            false,
        ))),
        false,
    );
    body.push(Statement::VariableDeclaration(
        builder.alloc_variable_declaration(
            SPAN,
            VariableDeclarationKind::Const,
            builder.vec1(read_module_id),
            false,
        ),
    ));
    let record_module_id = build_member_assign(
        builder,
        react_name,
        "__moduleId",
        builder.expression_identifier(SPAN, binding_atom),
    );
    if let Expression::FunctionExpression(function) = &mut factory {
        let has_closure = !function.params.items.is_empty();
        let statements = &mut function.body.as_mut().unwrap().statements;
        if !has_closure {
            let Some(Statement::ReturnStatement(mut returned)) = statements.pop() else {
                unreachable!("a worklet factory must return its worklet");
            };
            body.extend(statements.take_in(builder));
            body.push(record_module_id);
            factory = returned.argument.take().unwrap();
        } else {
            let return_index = statements.len() - 1;
            statements.insert(return_index, record_module_id);
        }
    }
    let export =
        builder.alloc_export_default_declaration(SPAN, ExportDefaultDeclarationKind::from(factory));
    body.push(Statement::ExportDefaultDeclaration(export));

    let directive_str = builder.str(WORKLET_MODULE_DIRECTIVE);
    let directive = builder.directive(
        SPAN,
        builder.string_literal(SPAN, directive_str, None),
        directive_str,
    );

    let program = builder.program(
        SPAN,
        oxc_span::SourceType::mjs(),
        "",
        builder.vec(),
        None,
        builder.vec1(directive),
        body,
    );
    let printed = oxc_codegen::Codegen::new()
        .with_options(oxc_codegen::CodegenOptions::default())
        .build(&program);

    let specifier = format!(
        "{INLINE_MODULE_SPECIFIER_PREFIX}{}",
        base64_encode(printed.code.as_bytes())
    );
    (specifier, printed.code)
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

const BASE64_ALPHABET: &[u8; 64] =
    b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

fn base64_encode(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
        let triple = (b0 << 16) | (b1 << 8) | b2;
        out.push(BASE64_ALPHABET[(triple >> 18) as usize & 63] as char);
        out.push(BASE64_ALPHABET[(triple >> 12) as usize & 63] as char);
        out.push(if chunk.len() > 1 {
            BASE64_ALPHABET[(triple >> 6) as usize & 63] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            BASE64_ALPHABET[triple as usize & 63] as char
        } else {
            '='
        });
    }
    out
}

#[cfg(test)]
mod tests {
    use super::base64_encode;

    #[test]
    fn encodes_like_the_standard_alphabet_with_padding() {
        assert_eq!(base64_encode(b""), "");
        assert_eq!(base64_encode(b"f"), "Zg==");
        assert_eq!(base64_encode(b"fo"), "Zm8=");
        assert_eq!(base64_encode(b"foo"), "Zm9v");
        assert_eq!(
            base64_encode(b"export default 1"),
            "ZXhwb3J0IGRlZmF1bHQgMQ=="
        );
    }
}
