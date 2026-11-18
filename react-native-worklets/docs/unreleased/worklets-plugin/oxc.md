# Oxc plugin options

> NOTE
>
> The Oxc plugin is a port of the [Worklets Babel plugin](https://docs.swmansion.com/react-native-worklets/docs/unreleased/worklets-plugin/about) to Rust, built on top of [Oxc](https://oxc.rs/). It's an opt-in alternative to the Babel plugin, which remains the default for the time being. Only [Bundle Mode](https://docs.swmansion.com/react-native-worklets/docs/unreleased/bundleMode) is supported.

Type definitions

```typescript
interface PluginOptions {
  extraPlugins?: string[];
  extraPresets?: string[];
  importForwarding?: {
    moduleNames?: string[];
    relativePaths?: string[];
  };
}
```

## Setup

For setup instructions, refer to the [Bundle Mode setup](https://docs.swmansion.com/react-native-worklets/docs/unreleased/bundleMode/setup?worklets-plugin=oxc#configure-worklets-plugin) with the Oxc plugin selected in the tabs.

## How to use

Pass an object with the options to the plugin in your `babel.config.js` file. Pass the plugin and its options as a **two-element array**:

```js {8-11}
/** @type {import('react-native-worklets/plugin-oxc').PluginOptions} */
const workletsPluginOptions = {
  importForwarding: {
    moduleNames: ['my-library'],
  },
};

module.exports = {
  ...
  plugins: [
    ...
    [
      'react-native-worklets/plugin-oxc/babel',
      workletsPluginOptions,
    ],
  ],
};
```

## Options

### importForwarding

Defaults to no forwarding (an empty object).

Configures [import forwarding](https://docs.swmansion.com/react-native-worklets/docs/unreleased/bundleMode/importForwarding). It works the same way as the [`importForwarding`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/worklets-plugin/plugin-options#importforwarding) option of the Babel plugin.

#### importForwarding.moduleNames

Defaults to an empty array.

Modules in this list are forwarded as imports inside worklet functions. The
module name has to be an exact match: with `my-library` in the list, imports from
`my-library/some-file` aren't forwarded. Only named and default
imports are forwarded; namespace imports such as
`import * as lib from 'my-library'` are captured from the closure instead. See
[`importForwarding.moduleNames`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/worklets-plugin/plugin-options#importforwardingmodulenames) of
the Babel plugin.

The Oxc plugin always forwards `react-native-worklets` and `react-native/Libraries/Core/setUpXHR`. The names in this list are added to them.

#### importForwarding.relativePaths

Defaults to an empty array.

List of paths that determine whether a module forwards its **relative** imports inside worklet functions. If the path of a module matches any of the paths, all relative imports inside the worklet functions of that module are forwarded. See [`importForwarding.relativePaths`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/worklets-plugin/plugin-options#importforwardingrelativepaths) of the Babel plugin.

The Oxc plugin always does this for modules of `react-native-worklets`. The paths in this list are added to it.

### extraPlugins

Accepted but ignored. The Oxc plugin cannot run other Babel plugins on worklet functions, so it prints a warning when this list is not empty. Add these plugins next to the Oxc plugin in your `babel.config.js` instead. See [`extraPlugins`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/worklets-plugin/plugin-options#extraplugins) of the Babel plugin.

### extraPresets

Accepted but ignored, in the same way as [`extraPlugins`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/worklets-plugin/oxc#extraplugins). See [`extraPresets`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/worklets-plugin/plugin-options#extrapresets) of the Babel plugin.

### Options that are always on

[`bundleMode`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/worklets-plugin/plugin-options#bundlemode) and [`strictGlobal`](https://docs.swmansion.com/react-native-worklets/docs/unreleased/worklets-plugin/plugin-options#strictglobal) are always on and cannot be turned off.

### Other Babel plugin options

The Oxc plugin ignores all other [Babel plugin options](https://docs.swmansion.com/react-native-worklets/docs/unreleased/worklets-plugin/plugin-options#options).

## Notes

Being a port, the Oxc plugin might not cover every edge case that the Babel plugin does. If you find a difference in behavior, please let us know on [GitHub](https://github.com/software-mansion/react-native-reanimated/).
