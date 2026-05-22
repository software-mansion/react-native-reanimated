use std::env;

const RELEASE_NEEDLES: &[&str] = &["prod", "release", "stage", "stagi"];

pub fn is_release() -> bool {
    let matches = |key: &str| match env::var(key) {
        Ok(v) => {
            let lower = v.to_ascii_lowercase();
            RELEASE_NEEDLES.iter().any(|n| lower.contains(*n))
        }
        Err(_) => false,
    };
    matches("BABEL_ENV") || matches("NODE_ENV")
}
