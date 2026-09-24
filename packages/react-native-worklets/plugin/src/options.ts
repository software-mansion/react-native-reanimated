export interface PluginOptions {
  /**
   * This is a list of Babel plugins that will be used when transforming
   * worklets' code with Worklets Babel Plugin.
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/plugin-options#extraplugins}
   *
   * - Defaults to an empty array `[]`.
   */
  extraPlugins?: string[];

  /**
   * This is a list of Babel presets that will be used when transforming
   * worklets' code with Worklets Babel Plugin.
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/plugin-options#extrapresets}
   *
   * - Defaults to an empty array `[]`.
   */
  extraPresets?: string[];

  /**
   * Configures [import
   * forwarding](https://docs.swmansion.com/react-native-worklets/docs/bundleMode/importForwarding)
   * for the Bundle Mode.
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/plugin-options#importforwarding}
   */
  importForwarding?: {
    /**
     * List of exact module names whose imports should be forwarded inside
     * worklets.
     *
     * The module name has to be an exact match — with `'my-library'` in the
     * list, an import from `'my-library/some-file'` won't be forwarded.
     *
     * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/plugin-options#importforwardingmodulenames}
     *
     * - Defaults to an empty array `[]`.
     */
    moduleNames?: string[];

    /**
     * List of paths used to determine which modules should forward their
     * relative imports inside worklets.
     *
     * If a module's path matches any of the provided paths, all relative
     * imports inside that module's worklets will be forwarded.
     *
     * Use this instead of {@link moduleNames} when you want to forward relative
     * imports (like `'./utils'`) from a specific package, without affecting
     * identically-named relative imports in other packages.
     *
     * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/plugin-options#importforwardingrelativepaths}
     *
     * - Defaults to an empty array `[]`.
     */
    relativePaths?: string[];
  };
}
