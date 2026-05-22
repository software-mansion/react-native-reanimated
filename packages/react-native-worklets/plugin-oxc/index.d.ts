export interface PluginOptions {
  bundleMode?: boolean;
  disableInlineStylesWarning?: boolean;
  disableSourceMaps?: boolean;
  disableWorkletClasses?: boolean;
  extraPlugins?: string[];
  extraPresets?: string[];
  globals?: string[];
  limitInitDataHoisting?: boolean;
  omitNativeOnlyData?: boolean;
  relativeSourceLocation?: boolean;
  strictGlobal?: boolean;
  substituteWebPlatformChecks?: boolean;
  workletizableModules?: string[];
}

export interface TransformResult {
  code: string;
}

export function transform(
  sourceText: string,
  filename: string,
  options?: PluginOptions
): TransformResult;
