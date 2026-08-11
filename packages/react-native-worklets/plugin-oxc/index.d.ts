export interface PluginOptions {
  /**
   * Accepted for config compatibility. This plugin supports Bundle Mode only;
   * passing `false` throws.
   */
  bundleMode?: boolean;
  /**
   * Accepted for compatibility with the babel-plugin-worklets options surface
   * but ignored — the OXC transform cannot dispatch arbitrary Babel plugins.
   * Compose the desired plugins around this one in `babel.config.js` instead.
   * When non-empty, the OXC transform emits a one-time `console.warn`.
   */
  extraPlugins?: string[];
  /** See `extraPlugins`. Ignored. */
  extraPresets?: string[];
  importForwarding?: {
    moduleNames?: string[];
    relativePaths?: string[];
  };
  /**
   * Extra identifiers that are never captured into `__closure` — host functions
   * and the like. Added on top of the default global allowlist.
   */
  globals?: string[];
  /**
   * When set, no unbound identifier is captured into `__closure` at all and the
   * `globals` option is ignored.
   */
  strictGlobal?: boolean;
  /** Replaces `isWeb()` and `shouldBeUseWeb()` calls with `true`. */
  substituteWebPlatformChecks?: boolean;
  /**
   * Suppresses the dev-only `console.warn` injected around shared values read
   * directly in inline `style` props.
   */
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
