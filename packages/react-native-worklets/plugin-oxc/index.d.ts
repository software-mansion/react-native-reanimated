export interface PluginOptions {
  bundleMode?: true;
  extraPlugins?: string[];
  extraPresets?: string[];
  importForwarding?: {
    moduleNames?: string[];
    relativePaths?: string[];
  };
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

export interface WorkletSourceTokens {
  hooks: string[];
  methods: string[];
}

export function workletSourceTokens(): WorkletSourceTokens;

export function transform(
  sourceText: string,
  filename: string,
  options?: PluginOptions
): TransformResult;
