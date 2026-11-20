use napi_derive::napi;

pub const SOURCE_MAP_COMMENT_PREFIX: &str = "//# workletSourceMap=";
const ORIGIN_COMMENT_PREFIX: &str = "// __workletOrigin:";

#[napi(object)]
pub struct RestoredPositions {
    pub source: Option<String>,
    pub positions: Vec<i32>,
}

pub fn restore_positions(code: &str, positions: &[u32]) -> Option<RestoredPositions> {
    let encoded = code
        .lines()
        .rev()
        .find_map(|line| line.strip_prefix(SOURCE_MAP_COMMENT_PREFIX))?;
    let json = base64_simd::STANDARD.decode_to_vec(encoded.trim()).ok()?;
    let map = oxc_sourcemap::SourceMap::from_json_string(std::str::from_utf8(&json).ok()?).ok()?;
    let table = map.generate_lookup_table();
    let line_offset = u32::from(code.starts_with(ORIGIN_COMMENT_PREFIX));

    let mut restored = Vec::with_capacity(positions.len());
    for pair in positions.chunks_exact(2) {
        let (line, column) = (pair[0], pair[1]);
        let token = line
            .checked_sub(1 + line_offset)
            .and_then(|line| {
                map.lookup_token(&table, line, column).or_else(|| {
                    table
                        .get(line as usize)
                        .and_then(|tokens| tokens.first().copied())
                })
            })
            .filter(|token| token.get_source_id().is_some());
        match token {
            Some(token) => {
                restored.push(token.get_src_line() as i32 + 1);
                restored.push(token.get_src_col() as i32);
            }
            None => {
                restored.push(-1);
                restored.push(-1);
            }
        }
    }

    Some(RestoredPositions {
        source: map.get_source(0).map(ToString::to_string),
        positions: restored,
    })
}
