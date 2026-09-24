extern crate napi_build;

use std::fs;
use std::path::PathBuf;

fn main() {
    napi_build::setup();

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let worklets_pkg = manifest_dir.join("..").join("package.json");
    println!("cargo:rerun-if-changed={}", worklets_pkg.display());

    let version = fs::read_to_string(&worklets_pkg)
        .ok()
        .and_then(|s| {
            let line = s
                .lines()
                .find(|line| line.trim_start().starts_with("\"version\""))?;
            let after = line.trim_start().strip_prefix("\"version\"")?;
            let colon = after.find(':')?;
            let rest = &after[colon + 1..];
            let q1 = rest.find('"')?;
            let q2 = rest[q1 + 1..].find('"')?;
            Some(rest[q1 + 1..q1 + 1 + q2].to_string())
        })
        .unwrap_or_else(|| "0.0.0".to_string());

    println!("cargo:rustc-env=WORKLETS_PACKAGE_VERSION={version}");
}
