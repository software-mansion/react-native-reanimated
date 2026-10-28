# Oxc plugin

> **Note**
>
> The Oxc plugin is a port of the [Worklets Babel plugin](https://docs.swmansion.com/react-native-worklets-next/docs/worklets-plugin/about) to Rust, built on top of [Oxc](https://oxc.rs/). It's an opt-in alternative to the Babel plugin, which remains the default for the time being. Only [Bundle Mode](https://docs.swmansion.com/react-native-worklets-next/docs/bundleMode) is supported.

## Setup

For setup instructions, refer to the [Bundle Mode setup](https://docs.swmansion.com/react-native-worklets-next/docs/bundleMode/setup?worklets-plugin=oxc#configure-worklets-plugin) with the Oxc plugin selected in the tabs.

## Options

The Oxc plugin accepts the [`importForwarding`](https://docs.swmansion.com/react-native-worklets-next/docs/worklets-plugin/plugin-options#importforwarding) option and it works the same way as in the Babel plugin.

[`bundleMode`](https://docs.swmansion.com/react-native-worklets-next/docs/worklets-plugin/plugin-options#bundlemode) and [`strictGlobal`](https://docs.swmansion.com/react-native-worklets-next/docs/worklets-plugin/plugin-options#strictglobal) are always on and cannot be turned off. The remaining options of the Babel plugin are ignored.

## Notes

Being a port, the Oxc plugin might not cover every edge case that the Babel plugin does. If you find a difference in behavior, please let us know on [GitHub](https://github.com/software-mansion/react-native-reanimated/).
