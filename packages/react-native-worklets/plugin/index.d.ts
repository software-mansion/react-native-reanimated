export interface PluginOptions {
  /**
   * This is a list of Babel plugins that will be used when transforming
   * worklets' code with Worklets Babel Plugin.
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-plugin/plugin-options/#extraplugins}
   *
   * - Defaults to an empty array `[]`.
   */
  extraPlugins?: string[];
  /**
   * This is a list of Babel presets that will be used when transforming
   * worklets' code with Worklets Babel Plugin.
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-plugin/plugin-options/#extrapresets}
   *
   * - Defaults to an empty array `[]`.
   */
  extraPresets?: string[];
  /**
   * Configures [import
   * forwarding](https://docs.swmansion.com/react-native-worklets/docs/bundleMode/importForwarding/)
   * for the Bundle Mode.
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-plugin/plugin-options/#importforwarding}
   */
  /**
   * Turns off the warning that the plugin prints when an
   * `importForwarding.relativePaths` entry has only common folder names, such
   * as `'src'` or `'app/src'`. Such a path can also match folders inside
   * packages in `node_modules`.
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-plugin/plugin-options/#silencedangerouspathswarning}
   *
   * - Defaults to `false`.
   */
  silenceDangerousPathsWarning?: boolean;
  importForwarding?: {
    /**
     * Modules in this list are forwarded as imports inside worklets.
     *
     * The module name has to be an exact match. With `'my-library'` in the
     * list, imports from `'my-library/some-file'` aren't forwarded. Add
     * `'my-library/some-file'` to the list to forward them too.
     *
     * Only named and default imports are forwarded. Namespace imports such
     * as `import * as lib from 'my-library'` are captured from the closure
     * instead.
     *
     * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-plugin/plugin-options/#importforwardingmodulenames}
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
     * Use this instead of {@link moduleNames} when you want to forward
     * relative imports (like `'./utils'`) from a specific package, without
     * affecting identically-named relative imports in other packages.
     *
     * A path matches a sequence of whole path segments (folder names and
     * the file name) anywhere in the module's path. For a module in
     * `node_modules`, only the part after the last `node_modules` is
     * compared. A common name such as `'src'` therefore also matches
     * packages with a `src` folder, for example
     * `react-native-reanimated/src`. Use a sequence of segments that only
     * your code has, and check that it does not occur in the paths of your
     * dependencies.
     *
     * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-plugin/plugin-options/#importforwardingrelativepaths}
     *
     * - Defaults to an empty array `[]`.
     */
    relativePaths?: string[];
  };
}
