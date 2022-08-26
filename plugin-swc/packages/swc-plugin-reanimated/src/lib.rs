use std::path::PathBuf;

use serde_json::Value;
use swc_core::{
    ast::*,
    common::FileName,
    plugin::{
        metadata::TransformPluginMetadataContextKind, metadata::TransformPluginProgramMetadata,
        plugin_transform,
    },
    visit::as_folder,
    visit::FoldWith,
};
use swc_reanimated_worklets_visitor::{create_worklets_visitor, WorkletsOptions};

#[plugin_transform]
pub fn process(program: Program, metadata: TransformPluginProgramMetadata) -> Program {
    let filename = if let Some(filename) =
        &metadata.get_context(&TransformPluginMetadataContextKind::Filename)
    {
        FileName::Real(PathBuf::from(filename))
    } else {
        FileName::Anon
    };

    let plugin_config: Option<Value> = serde_json::from_str(
        &metadata
            .get_transform_plugin_config()
            .expect("Should be able to get config"),
    )
    .ok();

    let relative_cwd = if let Some(config) = plugin_config {
        config["relativeCwd"]
            .as_str()
            .and_then(|v| Some(PathBuf::from(v.to_string())))
    } else {
        None
    };

    let visitor = create_worklets_visitor(
        WorkletsOptions::new(None, filename, relative_cwd),
        std::sync::Arc::new(metadata.source_map),
        metadata.comments,
    );

    program.fold_with(&mut as_folder(visitor))
}
