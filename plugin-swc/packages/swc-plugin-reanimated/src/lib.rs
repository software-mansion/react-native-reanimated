use std::path::PathBuf;

use serde_json::Value;
use swc_plugin::{ast::*, plugin_transform, source_map::FileName, TransformPluginProgramMetadata};
use swc_reanimated_worklets_visitor::{create_worklets_visitor, WorkletsOptions};

#[plugin_transform]
pub fn process(program: Program, metadata: TransformPluginProgramMetadata) -> Program {
    let context: Value = serde_json::from_str(&metadata.transform_context)
        .expect("Should able to deserialize context");
    let filename = if let Some(filename) = (&context["filename"]).as_str() {
        FileName::Real(PathBuf::from(filename))
    } else {
        FileName::Anon
    };

    let plugin_config: Option<Value> = serde_json::from_str(&metadata.plugin_config).ok();

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
