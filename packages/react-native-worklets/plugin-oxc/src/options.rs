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
    pub bundle_mode: Option<bool>,

    pub extra_plugins: Option<Vec<String>>,
    pub extra_presets: Option<Vec<String>>,
    pub import_forwarding: Option<ImportForwarding>,

    pub globals: Option<Vec<String>>,
    pub strict_global: Option<bool>,

    pub substitute_web_platform_checks: Option<bool>,
    pub disable_inline_styles_warning: Option<bool>,

    pub env_name: Option<String>,

    pub plugin_version: Option<String>,

    pub worklets_package_dir: Option<String>,
}
