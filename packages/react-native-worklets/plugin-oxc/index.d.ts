export interface PluginOptions {
  disableInlineStylesWarning?: boolean;
  disableSourceMaps?: boolean;
  disableWorkletClasses?: boolean;
  /**
   * Accepted for compatibility with the babel-plugin-worklets options surface
   * but ignored — the OXC transform cannot dispatch arbitrary Babel plugins.
   * Compose the desired plugins around this one in `babel.config.js` instead.
   * When non-empty, the OXC transform emits a one-time `console.warn`.
   */
  extraPlugins?: string[];
  /** See `extraPlugins`. Ignored. */
  extraPresets?: string[];
  globals?: string[];
  /**
   * When `true`, the init-data declaration for each worklet is placed at the
   * top of its enclosing function rather than at file top level. Honoured
   * per-worklet via the `'limit-init-data-hoisting'` directive.
   */
  limitInitDataHoisting?: boolean;
  omitNativeOnlyData?: boolean;
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
