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

pub fn worklet_hash_key(
    filename: &str,
    hash_root: Option<&str>,
    source_text: &str,
    body_start: u32,
) -> String {
    let root = hash_root.map(str::to_owned).unwrap_or_else(|| {
        std::env::current_dir()
            .map(|dir| dir.to_string_lossy().into_owned())
            .unwrap_or_default()
    });
    let source = relative_path(&root.replace('\\', "/"), filename);
    let byte_offset = (body_start as usize).min(source_text.len());
    let position = source_text
        .get(..byte_offset)
        .map_or(0, |prefix| prefix.encode_utf16().count());
    format!("{source}:{position}")
}

fn relative_path(from: &str, to: &str) -> String {
    let is_absolute = to.starts_with('/') || to.as_bytes().get(1) == Some(&b':');
    let to = if is_absolute {
        to.to_owned()
    } else {
        format!("{from}/{to}")
    };
    let from_parts = normalized_segments(from);
    let to_parts = normalized_segments(&to);
    if let (Some(from_drive), Some(to_drive)) = (drive_of(&from_parts), drive_of(&to_parts))
        && !from_drive.eq_ignore_ascii_case(to_drive)
    {
        return to_parts.join("/");
    }
    let common = from_parts
        .iter()
        .zip(to_parts.iter())
        .take_while(|(a, b)| same_segment(a, b))
        .count();
    let mut parts: Vec<&str> = std::iter::repeat_n("..", from_parts.len() - common).collect();
    parts.extend_from_slice(&to_parts[common..]);
    parts.join("/")
}

fn drive_of<'p>(parts: &[&'p str]) -> Option<&'p str> {
    parts.first().filter(|part| part.ends_with(':')).copied()
}

fn same_segment(a: &str, b: &str) -> bool {
    if cfg!(windows) {
        a.eq_ignore_ascii_case(b)
    } else {
        a == b
    }
}

fn normalized_segments(path: &str) -> Vec<&str> {
    let mut segments: Vec<&str> = Vec::new();
    for segment in path.split('/') {
        match segment {
            "" | "." => {}
            ".." => {
                segments.pop();
            }
            _ => segments.push(segment),
        }
    }
    segments
}

pub struct WorkletNames {
    pub react_name: String,
    pub factory_name: String,
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

    let factory_name = format!("{worklet_name}Factory");
    WorkletNames {
        react_name,
        factory_name,
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn worklet_hash_key_uses_relative_path_and_utf16_position() {
        let source = "const text = 'zażółć';\nconst foo = () => {};\n";
        let body_start = source.find('{').unwrap() as u32;
        assert_eq!(
            worklet_hash_key("/project/src/test.js", Some("/project"), source, body_start),
            "src/test.js:41"
        );
    }

    #[test]
    fn worklet_hash_key_resolves_relative_filenames_and_parent_directories() {
        assert_eq!(
            worklet_hash_key("test.js", Some("/project"), "", 0),
            "test.js:0"
        );
        assert_eq!(
            worklet_hash_key("/node_modules/lib/index.js", Some("/project"), "", 0),
            "../node_modules/lib/index.js:0"
        );
        assert_eq!(
            worklet_hash_key("C:/project/src/a.js", Some("C:\\project"), "", 0),
            "src/a.js:0"
        );
        assert_eq!(
            worklet_hash_key("D:/lib/a.js", Some("C:/project"), "", 0),
            "D:/lib/a.js:0"
        );
    }

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
        assert_eq!(
            source_from_filename(r"C:\a\b\node_modules\some-lib\dist\index.js"),
            "some-lib_index.js"
        );
        assert_eq!(source_from_filename(""), "unknownFile");
    }
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
    let parts: Vec<&str> = filename
        .split(['/', '\\'])
        .filter(|part| !part.is_empty())
        .collect();
    let base = parts.last().copied().unwrap_or("unknownFile");

    if let Some(idx) = parts.iter().position(|p| *p == "node_modules")
        && let Some(lib) = parts.get(idx + 1)
    {
        return format!("{lib}_{base}");
    }
    base.to_string()
}
