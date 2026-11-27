export interface PluginOptions {
  importForwarding?: {
    moduleNames?: string[];
    relativePaths?: string[];
  };
  silenceDangerousPathsWarning?: boolean;
}

export interface TransformOptions extends PluginOptions {
  envName?: string;
  pluginVersion?: string;
  inlineModules?: boolean;
  workletsPackageDir?: string;
  inPlace?: boolean;
  hashRoot?: string;
}

export interface EmittedFile {
  path: string;
  content: string;
}

export interface TransformResult {
  code: string;
  map?: string;
  files: EmittedFile[];
  /** Whether the transform rewrote anything; if not, the input AST still stands. */
  changed: boolean;
}

export function transform(
  sourceText: string,
  filename: string,
  options?: TransformOptions
): TransformResult;
