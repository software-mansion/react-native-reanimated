use std::path::Path;

/// Replicates the hash function from the original Babel plugin (workletFactory.ts).
/// Operates on UTF-16 code units, matching JS `charCodeAt`.
/// JS arithmetic semantics: `(h * 33) ^ char` is equivalent to `h.wrapping_mul(33) ^ char`
/// on `i32`, since the xor operator coerces both sides via ToInt32 (mod 2^32 signed).
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

/// Mirrors @babel/types `toIdentifier`:
/// 1. replace every non `[A-Za-z0-9$_]` char with `-`
/// 2. strip leading `-` runs (NOT digits — digits are preserved and the
///    whole thing gets `_`-prefixed below)
/// 3. camelize: `-x` → uppercased X, plain `-` runs collapse
/// 4. if still not a valid identifier (starts with digit, is empty), prefix `_`
pub fn to_identifier(input: &str) -> String {
    let mut buf = String::with_capacity(input.len());
    for ch in input.chars() {
        if ch.is_ascii_alphanumeric() || ch == '$' || ch == '_' {
            buf.push(ch);
        } else {
            buf.push('-');
        }
    }

    // Strip leading "-" runs only. Leading digits are preserved so they can
    // be detected at the end and prefixed with `_`, matching babel.
    let trimmed: String = buf.chars().skip_while(|c| *c == '-').collect();

    // Camelize "-x" / whitespace runs.
    let mut out = String::with_capacity(trimmed.len());
    let mut chars = trimmed.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '-' || c.is_whitespace() {
            while let Some(&n) = chars.peek() {
                if n == '-' || n.is_whitespace() {
                    chars.next();
                } else {
                    break;
                }
            }
            if let Some(next) = chars.next() {
                for u in next.to_uppercase() {
                    out.push(u);
                }
            }
        } else {
            out.push(c);
        }
    }

    if out.is_empty() {
        return "_".to_string();
    }

    if out
        .chars()
        .next()
        .map(|c| c.is_ascii_digit())
        .unwrap_or(false)
    {
        return format!("_{out}");
    }
    out
}

/// Computes the suffix used in worklet names from a filename, matching `makeWorkletName`.
/// Returns the same string the original code would build before incrementing the counter.
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

    // Look up library name when the file is under node_modules.
    let normalized = filename.replace('\\', "/");
    let parts: Vec<&str> = normalized.split('/').collect();
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

/// Mirrors `makeWorkletName` from workletFactory.ts.
/// `function_name` is the ObjectMethod key / FunctionDecl / FunctionExpr name, if any.
pub fn make_worklet_name(
    function_name: Option<&str>,
    filename: &str,
    worklet_number: u32,
) -> WorkletNames {
    let source = source_from_filename(filename);
    let suffix = format!("{source}{worklet_number}");

    let react_raw = function_name.unwrap_or("");
    let worklet_name = if react_raw.is_empty() {
        to_identifier(&suffix)
    } else {
        to_identifier(&format!("{react_raw}_{suffix}"))
    };
    let react_name = if react_raw.is_empty() {
        to_identifier(&suffix)
    } else {
        react_raw.to_string()
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
        // function testJs1(x){return x+2;}  -> 919891681460
        assert_eq!(worklet_hash("function testJs1(x){return x+2;}"), 919891681460);
        // function foo_testJs1(x){return x+2;}  -> 11633341088429
        assert_eq!(
            worklet_hash("function foo_testJs1(x){return x+2;}"),
            11633341088429
        );
        // function bar_testJs1(x){return x+2;}  -> 12638252513242
        assert_eq!(
            worklet_hash("function bar_testJs1(x){return x+2;}"),
            12638252513242
        );
        // function testJs1(){return{width:100};}  -> 1509422450054
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
        assert_eq!(to_identifier("123abc"), "_123abc");
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
