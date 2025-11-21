export interface PluginOptions {
  bundleMode?: boolean;
  disableInlineStylesWarning?: boolean;
  disableSourceMaps?: boolean;
  extraPlugins?: string[];
  extraPresets?: string[];
  globals?: string[];
  omitNativeOnlyData?: boolean;
  relativeSourceLocation?: boolean;
  substituteWebPlatformChecks?: boolean;
  workletizableModules?: string[];
}
