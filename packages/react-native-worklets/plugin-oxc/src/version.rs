use std::env;

use crate::types::State;

const MOCK_VERSION: &str = "x.y.z";

const REAL_VERSION: &str = env!("WORKLETS_PACKAGE_VERSION");

/**
 * The version stamped onto a worklet, or `None` in release builds where the
 * field is omitted entirely.
 */
pub fn plugin_version(state: &State) -> Option<&str> {
    if is_release(state.opts.env_name.as_deref()) {
        return None;
    }
    if should_mock_version() {
        return Some(MOCK_VERSION);
    }
    Some(state.opts.plugin_version.as_deref().unwrap_or(REAL_VERSION))
}

fn should_mock_version() -> bool {
    std::env::var("WORKLETS_JEST_SHOULD_MOCK_VERSION")
        .map(|v| v == "1")
        .unwrap_or(false)
}

const RELEASE_NEEDLES: &[&str] = &["prod", "release", "stage", "stagi"];

pub fn is_release(env_name: Option<&str>) -> bool {
    if let Some(env_name) = env_name {
        let lower = env_name.to_ascii_lowercase();
        if RELEASE_NEEDLES.iter().any(|needle| lower.contains(*needle)) {
            return true;
        }
        if lower.contains("dev") {
            return false;
        }
    }
    let matches = |key: &str| match env::var(key) {
        Ok(value) => {
            let lower = value.to_ascii_lowercase();
            RELEASE_NEEDLES.iter().any(|needle| lower.contains(*needle))
        }
        Err(_) => false,
    };
    matches("BABEL_ENV") || matches("NODE_ENV")
}
