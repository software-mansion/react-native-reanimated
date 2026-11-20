export interface PluginOptions {
  extraPlugins?: string[];
  extraPresets?: string[];
  importForwarding?: {
    moduleNames?: string[];
    relativePaths?: string[];
  };
  silenceDangerousPathsWarning?: boolean;
}

export interface TransformOptions extends PluginOptions {
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
  /** Whether the transform rewrote anything; if not, the input AST still stands. */
  changed: boolean;
}

export function transform(
  sourceText: string,
  filename: string,
  options?: TransformOptions
): TransformResult;

export interface RestoredPositions {
  source?: string;
  positions: number[];
}

export function restoreWorkletPositions(
  code: string,
  positions: number[]
): RestoredPositions | null;
