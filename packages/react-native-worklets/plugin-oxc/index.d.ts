export interface PluginOptions {
  bundleMode?: true;
  extraPlugins?: string[];
  extraPresets?: string[];
  importForwarding?: {
    moduleNames?: string[];
    relativePaths?: string[];
  };
  globals?: string[];
  strictGlobal?: boolean;
  substituteWebPlatformChecks?: boolean;
  disableInlineStylesWarning?: boolean;
  envName?: string;
  pluginVersion?: string;
  workletsPackageDir?: string;
}

export interface EmittedFile {
  path: string;
  content: string;
}

export interface TransformResult {
  code: string;
  map?: string;
  files: EmittedFile[];
}

export function transform(
  sourceText: string,
  filename: string,
  options?: PluginOptions
): TransformResult;
