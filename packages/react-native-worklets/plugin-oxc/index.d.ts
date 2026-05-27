export interface PluginOptions {
  bundleMode?: boolean;
  disableInlineStylesWarning?: boolean;
  disableSourceMaps?: boolean;
  disableWorkletClasses?: boolean;
  globals?: string[];
  omitNativeOnlyData?: boolean;
  relativeSourceLocation?: boolean;
  strictGlobal?: boolean;
  substituteWebPlatformChecks?: boolean;
  workletizableModules?: string[];
}

export interface EmittedFile {
  path: string;
  content: string;
}

export interface TransformResult {
  code: string;
  files: EmittedFile[];
}

export function transform(
  sourceText: string,
  filename: string,
  options?: PluginOptions
): TransformResult;
