use oxc_ast::ast::{Expression, JSXAttributeItem, JSXAttributeName, JSXOpeningElement};
use oxc_ast_visit::{walk_mut::walk_jsx_opening_element, VisitMut};

pub fn strip_jsx_dev_attributes(factory: &mut Expression<'_>) {
    let mut stripper = JsxDevAttributeStripper;
    stripper.visit_expression(factory);
}

struct JsxDevAttributeStripper;

impl<'a> VisitMut<'a> for JsxDevAttributeStripper {
    fn visit_jsx_opening_element(&mut self, element: &mut JSXOpeningElement<'a>) {
        element.attributes.retain(|item| {
            let JSXAttributeItem::Attribute(attribute) = item else {
                return true;
            };
            let JSXAttributeName::Identifier(name) = &attribute.name else {
                return true;
            };
            !matches!(name.name.as_str(), "__self" | "__source")
        });
        walk_jsx_opening_element(self, element);
    }
}
