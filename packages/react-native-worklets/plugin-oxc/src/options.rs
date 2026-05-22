use napi_derive::napi;

#[napi(object)]
#[derive(Default, Clone, Debug)]
pub struct PluginOptions {
    pub bundle_mode: Option<bool>,
    pub disable_inline_styles_warning: Option<bool>,
    pub disable_source_maps: Option<bool>,
    pub disable_worklet_classes: Option<bool>,
    pub extra_plugins: Option<Vec<String>>,
    pub extra_presets: Option<Vec<String>>,
    pub globals: Option<Vec<String>>,
    pub limit_init_data_hoisting: Option<bool>,
    pub omit_native_only_data: Option<bool>,
    pub relative_source_location: Option<bool>,
    pub strict_global: Option<bool>,
    pub substitute_web_platform_checks: Option<bool>,
    pub workletizable_modules: Option<Vec<String>>,
}
