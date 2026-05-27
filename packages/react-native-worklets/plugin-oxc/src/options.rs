use napi_derive::napi;

#[napi(object)]
#[derive(Default, Clone, Debug)]
pub struct PluginOptions {
    pub bundle_mode: Option<bool>,
    pub disable_inline_styles_warning: Option<bool>,
    pub disable_source_maps: Option<bool>,
    pub disable_worklet_classes: Option<bool>,
    /// Accepted for compatibility with the babel-plugin-worklets options
    /// surface, but UNUSED — the OXC transform can't dispatch arbitrary
    /// Babel plugins. Pre-/post-processing should be done by composing
    /// other Babel plugins around this one in babel.config.js instead.
    pub extra_plugins: Option<Vec<String>>,
    /// See `extra_plugins`. UNUSED.
    pub extra_presets: Option<Vec<String>>,
    pub globals: Option<Vec<String>>,
    /// Accepted for forward compat; currently only honoured per-worklet via
    /// the `'limit-init-data-hoisting'` directive, not as a file-wide flag.
    pub limit_init_data_hoisting: Option<bool>,
    pub omit_native_only_data: Option<bool>,
    pub relative_source_location: Option<bool>,
    pub strict_global: Option<bool>,
    pub substitute_web_platform_checks: Option<bool>,
    pub workletizable_modules: Option<Vec<String>>,

    /// Internal: the `react-native-worklets` package version, injected by the
    /// JS shim at transform time. Stamped onto every workletized function as
    /// `__pluginVersion` so the runtime can refuse code that was workletized
    /// by a mismatching plugin build. Falls back to `"x.y.z"` (the mock used
    /// by snapshot tests) when not supplied.
    pub plugin_version: Option<String>,

    /// Internal: absolute filesystem path to the `react-native-worklets`
    /// package root, resolved by the JS shim via `require.resolve`. Used by
    /// bundle-mode require rewriting to compute filesystem-correct relative
    /// paths from `<pkg>/.worklets/<hash>.js` back to the worklet's original
    /// source. Without it we fall back to a substring-based heuristic that
    /// only works for files already living inside the worklets package.
    pub worklets_package_dir: Option<String>,

    /// Internal: current working directory, injected by the JS shim. Used
    /// when `relativeSourceLocation` is set to compute the path stored in
    /// `__initData.location` (and rewritten inside the embedded source map).
    pub cwd: Option<String>,
}
