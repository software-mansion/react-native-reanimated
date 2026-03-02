export interface PluginOptions {
  /**
   * Enables the [Bundle
   * Mode](https://docs.swmansion.com/react-native-worklets/docs/experimental/bundle-mode).
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/plugin-options#bundle-mode}
   *
   * - Defaults to `false`.
   */
  bundleMode?: boolean;

  /**
   * Turning on this option suppresses a helpful warning when you use [inline
   * shared
   * values](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animations-in-inline-styling).
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/plugin-options#disableinlinestyleswarning}
   *
   * - Defaults to `false`.
   */
  disableInlineStylesWarning?: boolean;

  /**
   * This option turns off the source map generation for worklets. Mostly used
   * for testing purposes.
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/plugin-options#disablesourcemaps}
   *
   * - Defaults to `false`.
   */
  disableSourceMaps?: boolean;

  /**
   * Disables [Worklet Classes
   * support](https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/about#experimental-worklet-classes).
   * You might need to disable this feature when using [Custom
   * Serializables](https://docs.swmansion.com/react-native-worklets/docs/memory/registerCustomSerializable).
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/plugin-options#disableworkletclasses}
   *
   * - Defaults to `false`.
   */
  disableWorkletClasses?: boolean;

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
   * This is a list of identifiers (objects) that will not be copied to the UI
   * thread if a worklet requires them.
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/plugin-options#globals}
   *
   * - Defaults to an empty array `[]`.
   */
  globals?: string[];

  /** Temporary internal option to create ShareableUnpacker. */
  limitInitDataHoisting?: boolean;

  /**
   * This option comes in handy for Web apps. Because Babel ordinarily doesn't
   * get information about the target platform, it includes worklet data in the
   * bundle that only Native apps find relevant. If you enable this option, your
   * bundle size will be smaller.
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/plugin-options#omitnativeonlydata}
   *
   * - Defaults to `false`.
   */
  omitNativeOnlyData?: boolean;

  /**
   * This option dictates the passed file location for a worklet's source map.
   * If you enable this option, the file paths will be relative to `process.cwd`
   * (the current directory where Babel executes). This can be handy for Jest
   * test snapshots to ensure consistent results across machines.
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/plugin-options#relativesourcelocation}
   *
   * - Defaults to `false`.
   */
  relativeSourceLocation?: boolean;

  /**
   * This option makes it so no global identifiers are implicitly captured in
   * worklets' closures between runtimes.
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/plugin-options#strictglobal}
   *
   * Defaults to `false`.
   */
  strictGlobal?: boolean;

  /**
   * This option can also be useful for Web apps. In Reanimated, there are
   * numerous checks to determine the right function implementation for a
   * specific target platform. Enabling this option changes all the checks that
   * identify if the target is a Web app to `true`. This alteration can aid in
   * tree-shaking and contribute to reducing the bundle size.
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/plugin-options#substitutewebplatformchecks}
   *
   * - Defaults to `false`.
   */
  substituteWebPlatformChecks?: boolean;

  /**
   * This option allows you to register modules as safe to use on Worklet
   * Runtimes in the [Bundle
   * Mode](https://docs.swmansion.com/react-native-worklets/docs/experimental/bundle-mode).
   *
   * {@link https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/plugin-options#workletizablemodules}
   *
   * - Defaults to an empty array `[]`.
   */
  workletizableModules?: string[];
}
