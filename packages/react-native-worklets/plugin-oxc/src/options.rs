use napi_derive::napi;

#[napi(object)]
#[derive(Default, Clone, Debug)]
pub struct ImportForwarding {
    pub module_names: Option<Vec<String>>,
    pub relative_paths: Option<Vec<String>>,
}

#[napi(object)]
#[derive(Default, Clone, Debug)]
pub struct PluginOptions {
    pub import_forwarding: Option<ImportForwarding>,

    pub env_name: Option<String>,

    pub plugin_version: Option<String>,

    pub worklets_package_dir: Option<String>,

    pub in_place: Option<bool>,

    pub hash_root: Option<String>,
}
