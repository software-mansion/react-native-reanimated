extern crate napi_build;

use std::fs;
use std::path::PathBuf;

fn main() {
    napi_build::setup();

    // Bake the parent `react-native-worklets/package.json` version into the
    // binary as the fallback for `__pluginVersion` stamping. Mirrors how the
    // TS plugin reads `REAL_VERSION` synchronously at module load — the
    // version is always available even when the JS shim doesn't inject it
    // (raw napi callers, missing react-native-worklets resolution, etc.).
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let worklets_pkg = manifest_dir.join("..").join("package.json");
    println!("cargo:rerun-if-changed={}", worklets_pkg.display());

    let version = fs::read_to_string(&worklets_pkg)
        .ok()
        .and_then(|s| {
            // Tiny ad-hoc parse so we don't drag serde_json into build.rs.
            // Looks for `"version": "..."` at the top level.
            let key = "\"version\"";
            let idx = s.find(key)?;
            let after = &s[idx + key.len()..];
            let colon = after.find(':')?;
            let rest = &after[colon + 1..];
            let q1 = rest.find('"')?;
            let q2 = rest[q1 + 1..].find('"')?;
            Some(rest[q1 + 1..q1 + 1 + q2].to_string())
        })
        .unwrap_or_else(|| "0.0.0".to_string());

    println!("cargo:rustc-env=WORKLETS_PACKAGE_VERSION={version}");
}
