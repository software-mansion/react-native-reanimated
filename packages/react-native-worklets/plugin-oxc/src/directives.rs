use oxc_ast::AstBuilder;
use oxc_ast::ast::FunctionBody;
use oxc_span::SPAN;

const WORKLET_DIRECTIVES: &[&str] = &["worklet", "no-worklet-closure", "limit-init-data-hoisting"];

const NO_MEMO_DIRECTIVE: &str = "use no memo";

pub fn strip_worklet_directives<'a>(
    body: &mut FunctionBody<'a>,
    builder: AstBuilder<'a>,
    keep_no_memo: bool,
) {
    let was_worklet = body
        .directives
        .iter()
        .any(|d| d.directive.as_str() == "worklet");
    let has_no_memo = body
        .directives
        .iter()
        .any(|d| d.directive.as_str() == NO_MEMO_DIRECTIVE);
    if keep_no_memo {
        body.directives
            .retain(|d| !WORKLET_DIRECTIVES.contains(&d.directive.as_str()));
    } else {
        body.directives.clear();
    }
    if keep_no_memo && was_worklet && !has_no_memo {
        body.directives
            .push(build_directive(builder, NO_MEMO_DIRECTIVE));
    }
}

pub fn add_worklet_directives_to_function_body<'a>(
    body: &mut FunctionBody<'a>,
    builder: AstBuilder<'a>,
) {
    if has_worklet_directive(body) {
        return;
    }
    body.directives
        .insert(0, build_directive(builder, "worklet"));
}

fn build_directive<'a>(builder: AstBuilder<'a>, value: &str) -> oxc_ast::ast::Directive<'a> {
    let dir_str = builder.str(value);
    builder.directive(SPAN, builder.string_literal(SPAN, dir_str, None), dir_str)
}

pub fn has_worklet_directive(body: &FunctionBody<'_>) -> bool {
    body.directives
        .iter()
        .any(|d| d.directive.as_str() == "worklet")
}
