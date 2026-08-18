use std::path::Path;

use oxc_syntax::identifier::{is_identifier_part, is_identifier_start};

pub fn worklet_hash(s: &str) -> u64 {
    let units: Vec<u16> = s.encode_utf16().collect();
    let mut h1: i32 = 5381;
    let mut h2: i32 = 52711;
    for &c in units.iter().rev() {
        h1 = h1.wrapping_mul(33) ^ (c as i32);
        h2 = h2.wrapping_mul(33) ^ (c as i32);
    }
    (h1 as u32 as u64) * 4096 + (h2 as u32 as u64)
}

pub fn to_identifier(input: &str) -> String {
    let mapped: String = input
        .chars()
        .map(|c| if is_identifier_part(c) { c } else { '-' })
        .collect();

    let trimmed: &str = {
        let offset = mapped
            .char_indices()
            .find(|(_, c)| *c != '-' && !c.is_ascii_digit())
            .map(|(i, _)| i)
            .unwrap_or(mapped.len());
        &mapped[offset..]
    };

    let mut out = String::with_capacity(trimmed.len());
    let mut chars = trimmed.chars().peekable();
    while let Some(c) = chars.next() {
        if c != '-' {
            out.push(c);
            continue;
        }
        while chars.next_if_eq(&'-').is_some() {}
        if let Some(next) = chars.next() {
            out.extend(next.to_uppercase());
        }
    }

    if out
        .chars()
        .next()
        .is_none_or(|first| !is_identifier_start(first))
    {
        out.insert(0, '_');
    }
    out
}

pub fn source_from_filename(filename: &str) -> String {
    if filename.is_empty() {
        return "unknownFile".to_string();
    }
    let path = Path::new(filename);
    let base = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("unknownFile")
        .to_string();

    let parts: Vec<&str> = filename.split('/').collect();
    if let Some(idx) = parts.iter().position(|p| *p == "node_modules") {
        if let Some(lib) = parts.get(idx + 1) {
            return format!("{lib}_{base}");
        }
    }
    base
}

pub struct WorkletNames {
    pub worklet_name: String,
    pub react_name: String,
}

pub fn make_worklet_name(
    function_name: Option<&str>,
    filename: &str,
    worklet_number: u32,
) -> WorkletNames {
    let source = source_from_filename(filename);
    let suffix = format!("{source}{worklet_number}");

    let react_raw = function_name.unwrap_or("");
    let (worklet_name, react_name) = if react_raw.is_empty() {
        let generated = to_identifier(&suffix);
        (generated.clone(), generated)
    } else {
        (
            to_identifier(&format!("{react_raw}_{suffix}")),
            react_raw.to_string(),
        )
    };

    WorkletNames {
        worklet_name,
        react_name,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_matches_known_values() {
        assert_eq!(
            worklet_hash("function testJs1(x){return x+2;}"),
            919891681460
        );
        assert_eq!(
            worklet_hash("function foo_testJs1(x){return x+2;}"),
            11633341088429
        );
        assert_eq!(
            worklet_hash("function bar_testJs1(x){return x+2;}"),
            12638252513242
        );
        assert_eq!(
            worklet_hash("function testJs1(){return{width:100};}"),
            1509422450054
        );
    }

    #[test]
    fn to_identifier_camelizes_dotted_filenames() {
        assert_eq!(to_identifier("test.js1"), "testJs1");
        assert_eq!(to_identifier("foo_test.js1"), "foo_testJs1");
        assert_eq!(to_identifier("bar_test.js1"), "bar_testJs1");
        assert_eq!(to_identifier("123abc"), "abc");
        assert_eq!(to_identifier("2dExample.js1"), "dExampleJs1");
        assert_eq!(to_identifier("ünïcode"), "ünïcode");
        assert_eq!(to_identifier(""), "_");
    }

    #[test]
    fn source_from_filename_handles_node_modules() {
        assert_eq!(source_from_filename("test.js"), "test.js");
        assert_eq!(
            source_from_filename("/a/b/node_modules/some-lib/dist/index.js"),
            "some-lib_index.js"
        );
        assert_eq!(source_from_filename(""), "unknownFile");
    }
}
